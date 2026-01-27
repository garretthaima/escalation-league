#!/usr/bin/env python3
"""
Script to copy production database to dev and update dev-specific settings
Usage: ./scripts/copy-prod-to-dev.py [--dry-run]
"""

import os
import sys
import subprocess
import secrets
from datetime import datetime
from pathlib import Path

# ANSI color codes
class Colors:
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'

def load_env_file(filepath):
    """Load environment variables from a .env file"""
    env_vars = {}
    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            # Skip empty lines and comments
            if not line or line.startswith('#'):
                continue
            # Parse KEY=VALUE
            if '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                # Remove quotes if present
                value = value.strip().strip('"').strip("'")
                # Only set if not already set (first occurrence wins)
                # But for duplicate keys, use the LAST one (more recent)
                env_vars[key] = value
    return env_vars

def run_command(description, command, dry_run=False):
    """Execute or print a command"""
    if dry_run:
        print(f"{Colors.BLUE}[DRY RUN] {description}{Colors.NC}")
        print(f"{Colors.BLUE}  Would run: {command}{Colors.NC}")
        print()
        return True
    else:
        print(f"{Colors.GREEN}{description}{Colors.NC}")
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"{Colors.RED}Error: {result.stderr}{Colors.NC}")
            return False
        if result.stdout:
            print(result.stdout)
        print(f"{Colors.GREEN}Done{Colors.NC}")
        print()
        return True

def main():
    # Check for dry-run flag
    dry_run = '--dry-run' in sys.argv
    if dry_run:
        print("DRY RUN MODE - No changes will be made")
        print()

    # Get project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    # Load environment files
    env_prod_file = project_root / '.env.prod'
    env_dev_file = project_root / '.env.dev'

    if not env_prod_file.exists():
        print(f"{Colors.RED}Error: .env.prod not found at {env_prod_file}{Colors.NC}")
        sys.exit(1)

    if not env_dev_file.exists():
        print(f"{Colors.RED}Error: .env.dev not found at {env_dev_file}{Colors.NC}")
        sys.exit(1)

    print("Loading production environment variables...")
    prod_env = load_env_file(env_prod_file)
    prod_db_name = prod_env.get('DB_NAME')
    prod_db_root_password = prod_env.get('DB_ROOT_PASSWORD')

    print("Loading development environment variables...")
    dev_env = load_env_file(env_dev_file)
    dev_db_name = dev_env.get('DB_NAME')
    dev_db_user = dev_env.get('DB_USER')
    dev_db_root_password = dev_env.get('DB_ROOT_PASSWORD')

    print()

    # Container names
    prod_container = "escalation-league-db-prod"
    dev_container = "escalation-league-db-dev"

    # Temporary files
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dump_file = f"/tmp/prod_db_dump_{timestamp}.sql"
    backup_file = f"/tmp/dev_db_backup_{timestamp}.sql"

    print(f"{Colors.YELLOW}======================================{Colors.NC}")
    print(f"{Colors.YELLOW}Copy Production DB to Development{Colors.NC}")
    print(f"{Colors.YELLOW}======================================{Colors.NC}")
    print()

    # Verify containers are running
    print(f"{Colors.YELLOW}Checking containers...{Colors.NC}")
    result = subprocess.run("docker ps", shell=True, capture_output=True, text=True)
    if prod_container not in result.stdout:
        print(f"{Colors.RED}Error: {prod_container} is not running{Colors.NC}")
        sys.exit(1)
    if dev_container not in result.stdout:
        print(f"{Colors.RED}Error: {dev_container} is not running{Colors.NC}")
        sys.exit(1)
    print(f"{Colors.GREEN}Both containers are running{Colors.NC}")
    print()

    # Show database info
    print(f"{Colors.YELLOW}Source: {prod_container} - Database: {prod_db_name}{Colors.NC}")
    print(f"{Colors.YELLOW}Target: {dev_container} - Database: {dev_db_name}{Colors.NC}")
    print()

    # Show current dev database size
    print(f"{Colors.YELLOW}Current dev database info:{Colors.NC}")
    cmd = f"""docker exec {dev_container} mysql -u root -p{dev_db_root_password} -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)', COUNT(*) AS 'Tables' FROM information_schema.tables WHERE table_schema = '{dev_db_name}' GROUP BY table_schema;" """
    subprocess.run(cmd, shell=True)
    print()

    if not dry_run:
        # Confirmation
        print(f"{Colors.RED}WARNING: This will overwrite the development database!{Colors.NC}")
        print(f"{Colors.YELLOW}A backup will be created at: {backup_file}{Colors.NC}")
        confirm = input("Are you sure you want to continue? (yes/no): ")
        if confirm != "yes":
            print("Aborted.")
            sys.exit(0)
        print()

    # Step 0: Backup current dev database
    run_command(
        "Step 0: Backing up current dev database...",
        f"docker exec {dev_container} mysqldump -u root -p{dev_db_root_password} --single-transaction --routines --triggers --events {dev_db_name} > {backup_file}",
        dry_run
    )

    # Step 1: Dump production database
    run_command(
        "Step 1: Dumping production database...",
        f"docker exec {prod_container} mysqldump -u root -p{prod_db_root_password} --single-transaction --routines --triggers --events {prod_db_name} > {dump_file}",
        dry_run
    )

    if not dry_run and os.path.exists(dump_file):
        size = os.path.getsize(dump_file) / (1024 * 1024)
        print(f"{Colors.YELLOW}Dump file size: {size:.2f} MB{Colors.NC}")
        print()

    # Step 2: Drop and recreate dev database
    run_command(
        "Step 2: Dropping and recreating dev database...",
        f"docker exec {dev_container} mysql -u root -p{dev_db_root_password} -e 'DROP DATABASE IF EXISTS {dev_db_name}; CREATE DATABASE {dev_db_name};'",
        dry_run
    )

    # Step 3: Re-grant permissions
    run_command(
        "Step 3: Re-granting permissions to {dev_db_user}...",
        f"docker exec {dev_container} mysql -u root -p{dev_db_root_password} -e \"GRANT ALL PRIVILEGES ON {dev_db_name}.* TO '{dev_db_user}'@'%'; FLUSH PRIVILEGES;\"",
        dry_run
    )

    # Step 4: Import production data
    run_command(
        "Step 4: Importing production data to dev...",
        f"docker exec -i {dev_container} mysql -u root -p{dev_db_root_password} {dev_db_name} < {dump_file}",
        dry_run
    )

    # Step 5: Update dev-specific settings and generate new secret key
    # Generate a new random secret key for dev (64 bytes = 128 hex chars)
    new_secret_key = secrets.token_hex(64)

    if dry_run:
        print(f"{Colors.BLUE}[DRY RUN] Step 5: Would update dev-specific settings:{Colors.NC}")
        print(f"{Colors.BLUE}  - frontend_url -> https://dev.escalationleague.com{Colors.NC}")
        print(f"{Colors.BLUE}  - max_token_expiration -> 876000h{Colors.NC}")
        print(f"{Colors.BLUE}  - secret_key -> (new random key){Colors.NC}")
        print()
    else:
        print(f"{Colors.GREEN}Step 5: Updating dev-specific settings...{Colors.NC}")
        sql = f"""
        UPDATE settings SET value = 'https://dev.escalationleague.com' WHERE key_name = 'frontend_url';
        UPDATE settings SET value = '876000h' WHERE key_name = 'token_expiration';
        UPDATE settings SET value = '876000h' WHERE key_name = 'max_token_expiration';
        UPDATE settings SET value = '{new_secret_key}' WHERE key_name = 'secret_key';
        SELECT key_name, CASE WHEN key_name = 'secret_key' THEN CONCAT(LEFT(value, 8), '...') ELSE value END as value FROM settings WHERE key_name IN ('frontend_url', 'token_expiration', 'max_token_expiration', 'secret_key') ORDER BY key_name;
        """
        cmd = f"docker exec {dev_container} mysql -u root -p{dev_db_root_password} {dev_db_name} -e \"{sql}\""
        subprocess.run(cmd, shell=True)
        print(f"{Colors.GREEN}Settings updated (new secret_key generated){Colors.NC}")
        print()

    # Step 6: Clear refresh tokens (invalidates all prod sessions on dev)
    if dry_run:
        print(f"{Colors.BLUE}[DRY RUN] Step 6: Would clear refresh_tokens table{Colors.NC}")
        print(f"{Colors.BLUE}  This invalidates all sessions copied from prod{Colors.NC}")
        print()
    else:
        print(f"{Colors.GREEN}Step 6: Clearing refresh_tokens table...{Colors.NC}")
        sql = "DELETE FROM refresh_tokens; SELECT ROW_COUNT() as 'Tokens cleared';"
        cmd = f"docker exec {dev_container} mysql -u root -p{dev_db_root_password} {dev_db_name} -e \"{sql}\""
        subprocess.run(cmd, shell=True)
        print(f"{Colors.GREEN}All refresh tokens cleared{Colors.NC}")
        print()

    # Step 7: Cleanup
    if not dry_run:
        print(f"{Colors.GREEN}Step 7: Cleaning up...{Colors.NC}")
        print(f"{Colors.YELLOW}Keeping backup file: {backup_file}{Colors.NC}")
        print(f"{Colors.YELLOW}  To restore: docker exec -i {dev_container} mysql -u root -p{dev_db_root_password} {dev_db_name} < {backup_file}{Colors.NC}")
        if os.path.exists(dump_file):
            os.remove(dump_file)
        print(f"{Colors.GREEN}Cleanup complete{Colors.NC}")
        print()

    print(f"{Colors.GREEN}======================================{Colors.NC}")
    if dry_run:
        print(f"{Colors.BLUE}DRY RUN COMPLETE - No changes made{Colors.NC}")
    else:
        print(f"{Colors.GREEN}Database copy completed successfully!{Colors.NC}")
    print(f"{Colors.GREEN}======================================{Colors.NC}")
    print()

    if not dry_run:
        print(f"{Colors.YELLOW}Next steps:{Colors.NC}")
        print("1. Verify the dev environment: https://dev.escalationleague.com")
        print("2. Check that settings are correct in the dev database")
        print("3. Restart backend-dev: docker restart escalation-league-backend-dev")
        print()
        print(f"{Colors.YELLOW}If something went wrong, restore from backup:{Colors.NC}")
        print(f"docker exec -i {dev_container} mysql -u root -p{dev_db_root_password} {dev_db_name} < {backup_file}")
        print()

if __name__ == "__main__":
    main()