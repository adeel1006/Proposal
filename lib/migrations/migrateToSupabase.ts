/**
 * Migration script to transfer data from localStorage to Supabase
 * 
 * Usage:
 * 1. Open browser console on any page of your app
 * 2. Copy and paste this entire script
 * 3. Run: migrateDataToSupabase()
 * 
 * This script will:
 * - Upload all companies from localStorage to Supabase
 * - Upload all company services from localStorage to Supabase
 * - Create a backup of your data before migrating
 */

async function migrateDataToSupabase() {
  console.log('🚀 Starting data migration to Supabase...');

  // Step 1: Backup localStorage data
  const backup = {
    timestamp: new Date().toISOString(),
    companies: localStorage.getItem('companies'),
    timestamp_backup: new Date().toISOString(),
  };

  // Get all company service keys
  const allKeys = Object.keys(localStorage);
  const serviceKeys = allKeys.filter((key) => key.startsWith('company_services_'));
  serviceKeys.forEach((key) => {
    backup[key] = localStorage.getItem(key);
  });

  console.log('✅ Backup created:', backup);
  // Save backup to localStorage with special key
  localStorage.setItem('_migration_backup_' + new Date().getTime(), JSON.stringify(backup));

  // Step 2: Migrate companies
  try {
    const companiesData = localStorage.getItem('companies');
    if (companiesData) {
      const companies = JSON.parse(companiesData);
      console.log(`📝 Found ${companies.length} companies to migrate`);

      for (const company of companies) {
        try {
          const response = await fetch('/api/companies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(company),
          });

          if (!response.ok) {
            const error = await response.json();
            console.warn(`⚠️ Failed to migrate company ${company.id}:`, error);
          } else {
            console.log(`✅ Migrated company: ${company.businessName}`);
          }
        } catch (error) {
          console.error(`❌ Error migrating company ${company.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error migrating companies:', error);
  }

  // Step 3: Migrate company services
  try {
    for (const serviceKey of serviceKeys) {
      const companyId = serviceKey.replace('company_services_', '');
      const servicesData = localStorage.getItem(serviceKey);

      if (servicesData) {
        const services = JSON.parse(servicesData);
        console.log(
          `📦 Found ${services.length} services for company ${companyId}`
        );

        for (const service of services) {
          try {
            const servicePayload = {
              ...service,
              companyId: companyId,
            };

            const response = await fetch('/api/services', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(servicePayload),
            });

            if (!response.ok) {
              const error = await response.json();
              console.warn(`⚠️ Failed to migrate service ${service.id}:`, error);
            } else {
              console.log(
                `✅ Migrated service: ${service.name} (${service.companyId})`
              );
            }
          } catch (error) {
            console.error(`❌ Error migrating service ${service.id}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error migrating services:', error);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('🎉 Migration complete!');
  console.log('='.repeat(60));
  console.log('');
  console.log('Your data has been migrated to Supabase. You can now:');
  console.log(
    '1. Delete localStorage data (optional): localStorage.clear()'
  );
  console.log(
    '2. Refresh the page to load data from Supabase: location.reload()'
  );
  console.log('');
  console.log(
    'Backup of your original data is saved in localStorage (keys starting with "_migration_backup_")'
  );
  console.log('');
}

// Export for use in Node.js or other environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { migrateDataToSupabase };
}
