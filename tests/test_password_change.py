import unittest
from unittest.mock import Mock

from pydantic import ValidationError

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import PasswordChange
from app.services.user_service import change_password


class PasswordChangeTests(unittest.TestCase):
    def setUp(self):
        self.db = Mock()
        session_query = self.db.query.return_value.filter.return_value
        session_query.with_entities.return_value.all.return_value = []
        session_query.update.return_value = 0
        self.user = User(
            id=1,
            username="owner",
            email="owner@example.com",
            hashed_password=hash_password("Ancien123!"),
        )

    def test_changes_password_after_verifying_current_password(self):
        change_password(
            self.db,
            self.user,
            PasswordChange(
                current_password="Ancien123!",
                new_password="Nouveau456!",
            ),
        )

        self.assertTrue(
            verify_password("Nouveau456!", self.user.hashed_password)
        )
        self.assertFalse(
            verify_password("Ancien123!", self.user.hashed_password)
        )
        self.db.commit.assert_called_once_with()
        self.db.refresh.assert_not_called()

    def test_rejects_incorrect_current_password_without_writing(self):
        original_hash = self.user.hashed_password

        with self.assertRaisesRegex(ValueError, "actuel est incorrect"):
            change_password(
                self.db,
                self.user,
                PasswordChange(
                    current_password="Incorrect123!",
                    new_password="Nouveau456!",
                ),
            )

        self.assertEqual(self.user.hashed_password, original_hash)
        # The password is untouched, but the failed sensitive action is
        # committed to the security journal.
        self.db.commit.assert_called_once_with()

    def test_rejects_password_reuse_without_writing(self):
        with self.assertRaisesRegex(ValueError, "doit être différent"):
            change_password(
                self.db,
                self.user,
                PasswordChange(
                    current_password="Ancien123!",
                    new_password="Ancien123!",
                ),
            )

        self.db.commit.assert_not_called()

    def test_validates_minimum_length_and_general_size_limit(self):
        with self.assertRaises(ValidationError):
            PasswordChange(current_password="Ancien123!", new_password="court")

        # Argon2id does not inherit bcrypt's legacy 72-byte ceiling.
        PasswordChange(current_password="Ancien123!", new_password="é" * 40)

        with self.assertRaises(ValidationError):
            PasswordChange(current_password="Ancien123!", new_password="é" * 600)


if __name__ == "__main__":
    unittest.main()
