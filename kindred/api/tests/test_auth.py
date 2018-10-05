import logging
from unittest import skip

from django.test import TestCase
from reversion.models import Version

from ...people.models import Person

API_BASE = "/api/v1"
TEST_EMAIL = "root@localhost"
TEST_PASSWORD = "hello"

logger = logging.getLogger(__name__)


class TestAuthentication(TestCase):
    """
    Some basic tests to check that authentication is enabled on all
    views which might contain patient data.
    """

    def _login(self):
        result = self.client.login(email=TEST_EMAIL, password=TEST_PASSWORD)
        if not result:
            logger.warning("Login failed")

    def _url(self, *path):
        return "/".join([API_BASE] + list(map(str, path)))

    def _post(self, *path, **data):
        return self.client.post(self._url(*path), data=data,
                                content_type="application/json")

    def _get(self, *path):
        return self.client.get(self._url(*path))

    def setUp(self):
        self.person = Person.objects.create(
            first_name="Test",
            last_name="Person",
            dob="1900-01-01")

    def tearDown(self):
        self.person.delete()

    def test_anon_api_base(self):
        response = self._get()
        self.assertEqual(response.status_code, 200)

    def test_login_api_base(self):
        self._login()
        response = self._get()
        self.assertEqual(response.status_code, 200)

    def test_anon_person_list(self):
        response = self._get("person")
        self.assertEqual(response.status_code, 401)

    def test_anon_person_detail(self):
        response = self._get("person", "1")
        self.assertEqual(response.status_code, 401)

    def test_anon_schema(self):
        response = self._get("person", "schema")
        self.assertEqual(response.status_code, 200)

    def test_anon_state_list(self):
        response = self._get("state")
        self.assertEqual(response.status_code, 200)

    def test_anon_state_detail(self):
        response = self._get("state", "1")
        self.assertEqual(response.status_code, 200)

    def test_anon_state_schema(self):
        response = self._get("state", "schema")
        self.assertEqual(response.status_code, 200)

    def test_login_person_list(self):
        self._login()
        response = self._get("person")
        self.assertEqual(response.status_code, 200)

    def test_login_person_detail(self):
        self._login()
        response = self._get("person", self.person.id)
        self.assertEqual(response.status_code, 200)

    def test_login_schema(self):
        self._login()
        response = self._get("person", "schema")
        self.assertEqual(response.status_code, 200)

    @skip("broken models")
    def test_anon_madeline2_view(self):
        response = self.client.get("/views/madeline/1.svg")
        self.assertEqual(response.status_code, 302)  # redirect to login page

    @skip("broken models")
    def test_login_madeline2_view(self):
        fg = self._create_family_group("test_login_madeline2_view")
        self._login()
        response = self.client.get("/views/madeline/%d.svg" % fg.id)
        self.assertEqual(response.status_code, 200)

    @skip("broken models")
    def test_login_madeline2_view_post(self):
        self._login()
        response = self.client.post("/views/madeline/1.svg")
        self.assertEqual(response.status_code, 405)

    def _create_family_group(self, name):
        from kindred.people.models import FamilyGroup, FamilyMember, Person
        fg = FamilyGroup.objects.create(desc=name)
        for p in Person.objects.all()[:10]:
            FamilyMember.objects.create(family_group=fg, person=p)
        return fg

    def test_anon_studygroup_append(self):
        response = self._post("studygroup", "42", "append")
        self.assertEqual(response.status_code, 401)

    def test_versions(self):
        ver = Version.objects.filter(content_type__model="person",
                                     content_type__app_label="people").first()
        if ver:
            self._login()
            response = self._get("person", ver.object_id, "versions", ver.id, "")
            self.assertEqual(response.status_code, 200)

    def test_anon_versions(self):
        person = Person.objects.order_by("id").first()
        response = self._get("person", person.id, "versions", "666", "")
        self.assertEqual(response.status_code, 401)
