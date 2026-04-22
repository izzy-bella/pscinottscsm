# Church member import package

Files included:
- `church_members_import.csv`
- `church_households_import.csv`
- `church_member_import_audit.csv`
- `church_member_import_package.xlsx`

## What was done
- Cleaned the uploaded member file into an import-ready members table.
- Grouped members into households using shared cleaned addresses.
- Added `household_id` links between members and households.
- Preserved source member IDs as `external_member_id`.
- Added review flags for missing or suspicious data.

## Key findings
- Member rows: 158
- Households created: 67
- Missing address: 4
- Missing DOB: 158
- Missing phone: 158
- Missing email: 158
- Missing contact preference: 158
- Missing join date: 158
- Missing gender: 6
- Non-standard member IDs: 158

## Suggested backend mapping

### households
- household_id
- household_name
- address_full
- postcode

### members
- external_member_id
- full_name
- first_name
- middle_name
- last_name
- date_of_birth
- gender
- phone_number
- email
- membership_status
- join_date
- household_id

## Review notes
- One row has a non-standard member ID and should be checked manually.
- Four rows have no address, so they were left without a household link.
