from peewee import (
    Model,
    TextField,
    AutoField,
)
from playhouse.postgres_ext import (
    PostgresqlExtDatabase,
    BinaryJSONField,
    ArrayField
)
from dotenv import load_dotenv
import os

load_dotenv()

# peewee expects the database name to be passed as a positional argument, and passes on the rest of the arguments to the underlying psycopg2 connection. This is why we need to pass the database name as a positional argument, and the rest of the arguments as keyword arguments.
dbname = os.environ['DB_NAME']
db_params = {
    'user': os.environ['DB_USER'],
    'password': os.environ['DB_PASSWORD'],
    'host': os.environ['DB_HOST'],
    'port': os.environ['DB_PORT']
    }

db = PostgresqlExtDatabase(dbname, **db_params)


class BaseModel(Model):
    class Meta:
        database = db


class DbtModelORM(BaseModel):
    id = AutoField(primary_key=True)
    name = TextField(unique=True, null=False)
    absolute_path = TextField(null=False)
    relative_path = TextField(null=False)
    documentation = BinaryJSONField(null=True)
    deps = ArrayField(TextField, null=True)
    refs = ArrayField(TextField, null=True)
    sources = BinaryJSONField(null=True)
    sql_contents = TextField(null=True)
    yaml_path = TextField(null=True)

    class Meta:
        table_name = "dbt_models"
        schema = "public"


class SourceORM(BaseModel):
    pass



if __name__ == "__main__":
    query = DbtModelORM.select()
    lst = [user.username for user in query]
    print(lst)