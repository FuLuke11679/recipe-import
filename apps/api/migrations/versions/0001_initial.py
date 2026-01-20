"""initial schema"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "import_jobs",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.String(), nullable=False, index=True),
        sa.Column("url", sa.String(), nullable=False, index=True),
        sa.Column("status", sa.Enum("CREATED", "FETCHING_METADATA", "METADATA_READY", "AWAITING_RECIPE_TEXT", "EXTRACTING", "EXTRACTED", "ADAPTING", "ADAPTED", "FAILED", name="importstatus"), nullable=False, server_default="CREATED"),
        sa.Column("import_metadata", sa.JSON(), nullable=True),
        sa.Column("raw_recipe_text", sa.Text(), nullable=True),
        sa.Column("parsed_recipe", sa.JSON(), nullable=True),
        sa.Column("adapted_recipe", sa.JSON(), nullable=True),
        sa.Column("change_summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("import_jobs")

