#!/bin/zsh
set -e
cd /Users/takumashinnyo/Workspace/projects/NightOps/nightclub-saas
git init
git remote add origin git@github.com:seiren-inc/nightclub-saas.git

cat << 'INNEREOF' > README.md
# NightClub SaaS

## プロジェクト概要
・勤怠・売上・顧客・給与の統合SaaS
・現フェーズは設計（実装未開始）
・docs配下が正本であること
・実装開始条件は設計検証完了後のみ
INNEREOF

cat << 'INNEREOF' > .gitignore
# Node/Next/Flutter General
node_modules/
dist/
build/
.next/
.turbo/
.env*
*.log
.DS_Store
INNEREOF

cp ../docs/01_requirements.md docs/Doc-01_requirements.md
cp ../docs/02_basic_design.md docs/Doc-02_system_basic_design.md
cp ../docs/03_detailed_design.md docs/Doc-03_database_detail_design.md
cp ../docs/04_technical_design.md docs/Doc-04_application_detail_design.md
cp ../docs/05_test_design.md docs/Doc-05_test_design.md
cp ../docs/06_implementation_plan.md docs/Doc-06_operations_and_production_architecture.md
cp ../docs/Doc-07_access_control_design.md docs/Doc-07_access_control_design.md
cp ../docs/Doc-08_audit_log_design.md docs/Doc-08_audit_log_design.md
cp ../docs/Doc-09_data_retention_design.md docs/Doc-09_data_retention_design.md
cp ../docs/Doc-10_notification_design.md docs/Doc-10_notification_design.md
cp ../docs/Doc-11_error_code_design.md docs/Doc-11_error_handling_design.md
cp ../docs/Doc-12_operations_design.md docs/Doc-12_operations_design.md
cp ../docs/Doc-13_security_design.md docs/Doc-13_security_design.md
cp ../docs/Doc-14_master_setting_design.md docs/Doc-14_master_setting_design.md
cp ../docs/Doc-15_close_and_change_control_design.md docs/Doc-15_close_and_change_control_design.md
cp ../docs/Doc-16_data_import_design.md docs/Doc-16_data_migration_import_design.md
cp ../docs/Doc-17_ui_design.md docs/Doc-17_ui_specification.md
cp ../docs/Doc-18_local_dev_environment_design.md docs/Doc-18_local_dev_environment_design.md
cp ../docs/Doc-19_release_and_deployment_design.md docs/Doc-19_release_and_deployment_design.md

git add README.md .gitignore
git commit -m "chore: initialize docs repository" || echo "already committed"

git add docs/Doc-01_requirements.md docs/Doc-02_system_basic_design.md docs/Doc-03_database_detail_design.md docs/Doc-04_application_detail_design.md docs/Doc-05_test_design.md docs/Doc-06_operations_and_production_architecture.md
git commit -m "docs: add core design docs (Doc-01 to Doc-06)" || echo "no changes"

git add docs/Doc-07_access_control_design.md docs/Doc-08_audit_log_design.md
git commit -m "docs: add access control and audit design (Doc-07, Doc-08)" || echo "no changes"

git add docs/Doc-09_data_retention_design.md docs/Doc-10_notification_design.md docs/Doc-11_error_handling_design.md
git commit -m "docs: add data retention and notification design (Doc-09 to Doc-11)" || echo "no changes"

git add docs/Doc-12_operations_design.md docs/Doc-13_security_design.md
git commit -m "docs: add operations and security design (Doc-12, Doc-13)" || echo "no changes"

git add docs/Doc-14_master_setting_design.md docs/Doc-15_close_and_change_control_design.md
git commit -m "docs: add master settings and close control design (Doc-14, Doc-15)" || echo "no changes"

git add docs/Doc-16_data_migration_import_design.md docs/Doc-17_ui_specification.md
git commit -m "docs: add migration and ui spec (Doc-16, Doc-17)" || echo "no changes"

git add docs/Doc-18_local_dev_environment_design.md docs/Doc-19_release_and_deployment_design.md
git commit -m "docs: add local dev and release design (Doc-18, Doc-19)" || echo "no changes"

git branch -M main
git push -u origin main
