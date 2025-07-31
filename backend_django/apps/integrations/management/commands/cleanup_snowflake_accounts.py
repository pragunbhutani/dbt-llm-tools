from django.core.management.base import BaseCommand
from apps.integrations.models import OrganisationIntegration


class Command(BaseCommand):
    help = (
        "Clean up Snowflake account names that contain .snowflakecomputing.com suffixes"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be changed without making actual changes",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        # Find all Snowflake integrations
        snowflake_integrations = OrganisationIntegration.objects.filter(
            integration_key="snowflake", is_enabled=True
        )

        if not snowflake_integrations:
            self.stdout.write(self.style.WARNING("No Snowflake integrations found."))
            return

        updated_count = 0

        for integration in snowflake_integrations:
            credentials = integration.credentials
            account = credentials.get("account", "")

            if not account:
                continue

            original_account = account
            account = account.strip()

            # Remove .snowflakecomputing.com suffix if present
            if account.endswith(".snowflakecomputing.com"):
                account = account[: -len(".snowflakecomputing.com")]

            # Also remove any other common suffixes that might cause issues
            for suffix in [".snowflakecomputing.com", ".aws.snowflakecomputing.com"]:
                if account.endswith(suffix):
                    account = account[: -len(suffix)]
                    break

            if account != original_account:
                org_name = (
                    integration.organisation.name
                    if integration.organisation
                    else "Unknown"
                )

                if dry_run:
                    self.stdout.write(
                        f"[DRY RUN] Would update {org_name}: '{original_account}' -> '{account}'"
                    )
                else:
                    # Update the credentials
                    credentials["account"] = account
                    integration.credentials = credentials
                    integration.save()

                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Updated {org_name}: '{original_account}' -> '{account}'"
                        )
                    )

                updated_count += 1

        if updated_count == 0:
            self.stdout.write(
                self.style.SUCCESS("No Snowflake account names needed cleaning.")
            )
        else:
            action = "would be updated" if dry_run else "updated"
            self.stdout.write(
                self.style.SUCCESS(f"Total integrations {action}: {updated_count}")
            )

            if dry_run:
                self.stdout.write(
                    self.style.WARNING(
                        "This was a dry run. Run without --dry-run to apply changes."
                    )
                )
