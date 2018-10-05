def get_api_resource(resourcename):
    from ..api.base import v1
    return v1._registry[resourcename]


def get_tablename_from_resource(resourcename):
    resource = get_api_resource(resourcename)
    cls = resource.get_model()
    return cls._meta.db_table
