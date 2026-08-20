import unittest
from unittest.mock import patch

from pydantic import ValidationError
from sqlalchemy import create_engine, event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

import app.models  # noqa: F401 - register all relationships before mapper configuration
from app.database.base import Base
from app.models.company import Company
from app.models.customer import Customer
from app.models.prospect import Prospect
from app.models.user import User
from app.schemas.prospect import ProspectCreate, ProspectUpdate
from app.services import prospect_service


class ProspectSchemaTests(unittest.TestCase):
    def test_converted_status_is_reserved_for_conversion_endpoint(self):
        valid_data = {
            "first_name": "Jean",
            "last_name": "Martin",
            "email": "jean@example.com",
            "phone": "0612345678",
        }

        with self.assertRaises(ValidationError):
            ProspectCreate(**valid_data, status="converted")
        with self.assertRaises(ValidationError):
            ProspectUpdate(status="converted")

    def test_status_and_priority_are_validated(self):
        with self.assertRaises(ValidationError):
            ProspectCreate(
                first_name="Jean",
                last_name="Martin",
                email="jean@example.com",
                phone="0612345678",
                priority="urgent",
            )


class ProspectServiceTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite+pysqlite:///:memory:")

        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(dbapi_connection, _connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        Base.metadata.create_all(
            self.engine,
            tables=[
                User.__table__,
                Company.__table__,
                Customer.__table__,
                Prospect.__table__,
            ],
        )
        self.session_factory = sessionmaker(bind=self.engine, expire_on_commit=False)
        self.db: Session = self.session_factory()
        self.user, self.company = self._create_tenant("owner", "Acme")
        self.other_user, self.other_company = self._create_tenant("other", "Other Co")

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def _create_tenant(self, username: str, company_name: str) -> tuple[User, Company]:
        user = User(
            username=username,
            email=f"{username}@example.com",
            hashed_password="hash",
        )
        self.db.add(user)
        self.db.flush()
        company = Company(
            name=company_name,
            email=f"{username}-company@example.com",
            phone="0612345678",
            owner_id=user.id,
        )
        self.db.add(company)
        self.db.commit()
        self.db.refresh(user)
        return user, company

    def _create_prospect(
        self,
        *,
        user: User | None = None,
        email: str = "prospect@example.com",
        status: str = "new",
        priority: str = "medium",
    ) -> Prospect:
        return prospect_service.create_prospect(
            self.db,
            ProspectCreate(
                first_name="Marie",
                last_name="Durand",
                email=email,
                phone="0611223344",
                organization="Mine Corp",
                notes="Premier échange au salon.",
                status=status,
                priority=priority,
            ),
            user or self.user,
        )

    def test_crud_and_filters_are_tenant_scoped(self):
        own = self._create_prospect(status="qualified", priority="high")
        self._create_prospect(
            user=self.other_user,
            email="other@example.com",
            status="qualified",
            priority="high",
        )

        items, total = prospect_service.get_prospects(
            self.db,
            self.user,
            search="Mine Corp",
            status="qualified",
            priority="high",
        )
        self.assertEqual(total, 1)
        self.assertEqual([item.id for item in items], [own.id])

        with self.assertRaises(prospect_service.ProspectNotFoundError):
            prospect_service.get_prospect(self.db, own.id, self.other_user)
        with self.assertRaises(prospect_service.ProspectNotFoundError):
            prospect_service.convert_prospect(self.db, own.id, self.other_user)
        self.assertEqual(self.db.query(Customer).count(), 0)

        updated = prospect_service.update_prospect(
            self.db,
            own.id,
            ProspectUpdate(priority="low", notes=None),
            self.user,
        )
        self.assertEqual(updated.priority, "low")
        self.assertIsNone(updated.notes)

        prospect_service.delete_prospect(self.db, own.id, self.user)
        self.assertIsNone(
            self.db.query(Prospect).filter(Prospect.id == own.id).first()
        )

    def test_conversion_creates_customer_and_preserves_prospect(self):
        source = self._create_prospect(status="qualified", priority="high")

        converted, customer = prospect_service.convert_prospect(
            self.db,
            source.id,
            self.user,
        )

        self.assertEqual(converted.status, "converted")
        self.assertIsNotNone(converted.converted_at)
        self.assertEqual(converted.customer_id, customer.id)
        self.assertEqual(customer.company_id, self.company.id)
        self.assertEqual(customer.email, source.email)
        self.assertIsNotNone(self.db.get(Prospect, source.id))

        with self.assertRaises(prospect_service.ProspectConflictError):
            prospect_service.convert_prospect(self.db, source.id, self.user)
        self.assertEqual(
            self.db.query(Customer)
            .filter(Customer.company_id == self.company.id)
            .count(),
            1,
        )

    def test_conversion_rejects_existing_customer_email_case_insensitively(self):
        source = self._create_prospect(email="CLIENT@EXAMPLE.COM")
        self.db.add(
            Customer(
                first_name="Existing",
                last_name="Customer",
                email="client@example.com",
                phone="0699999999",
                company_id=self.company.id,
            )
        )
        self.db.commit()

        with self.assertRaisesRegex(
            prospect_service.ProspectConflictError,
            "adresse e-mail existe déjà",
        ):
            prospect_service.convert_prospect(self.db, source.id, self.user)

        self.db.refresh(source)
        self.assertEqual(source.status, "new")
        self.assertIsNone(source.customer_id)

    def test_conversion_rolls_back_customer_and_prospect_on_database_error(self):
        source = self._create_prospect()
        database_error = IntegrityError("INSERT", {}, Exception("failure"))
        original_flush = self.db.flush

        def fail_customer_flush(*args, **kwargs):
            if any(isinstance(item, Customer) for item in self.db.new):
                raise database_error
            return original_flush(*args, **kwargs)

        with patch.object(self.db, "flush", side_effect=fail_customer_flush):
            with self.assertRaises(prospect_service.ProspectConflictError):
                prospect_service.convert_prospect(self.db, source.id, self.user)

        self.db.refresh(source)
        self.assertEqual(source.status, "new")
        self.assertIsNone(source.customer_id)
        self.assertEqual(self.db.query(Customer).count(), 0)

    def test_converted_prospect_cannot_be_edited_or_deleted(self):
        source = self._create_prospect()
        prospect_service.convert_prospect(self.db, source.id, self.user)

        with self.assertRaises(prospect_service.ProspectConflictError):
            prospect_service.update_prospect(
                self.db,
                source.id,
                ProspectUpdate(priority="low"),
                self.user,
            )
        with self.assertRaises(prospect_service.ProspectConflictError):
            prospect_service.delete_prospect(self.db, source.id, self.user)


if __name__ == "__main__":
    unittest.main()
