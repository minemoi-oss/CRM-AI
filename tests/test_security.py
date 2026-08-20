import unittest

from app.core.security import create_access_token, decode_access_token
from app.models.company import Company
from app.models.user import User
from app.services.access import ensure_company_access, get_company_id
from fastapi import HTTPException


class SecurityTests(unittest.TestCase):
    def test_access_token_round_trip(self):
        token = create_access_token({"sub": "42"})
        self.assertEqual(decode_access_token(token)["sub"], "42")

    def test_company_id_comes_from_authenticated_user(self):
        user = User(id=1, username="owner", email="owner@example.com", hashed_password="hash")
        user.company = Company(id=7, name="Acme", email="company@example.com", phone="12345678", owner_id=1)
        self.assertEqual(get_company_id(user), 7)

    def test_cross_company_access_is_hidden(self):
        user = User(id=1, username="owner", email="owner@example.com", hashed_password="hash")
        user.company = Company(id=7, name="Acme", email="company@example.com", phone="12345678", owner_id=1)
        with self.assertRaises(HTTPException) as context:
            ensure_company_access(8, user)
        self.assertEqual(context.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
