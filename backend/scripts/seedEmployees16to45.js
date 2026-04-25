/**
 * Seed script: Insert employees TSI00016 – TSI00045 into the deployed app
 * Run from the backend folder:  node scripts/seedEmployees16to45.js
 *
 * POST /api/employees requires no auth token.
 * Duplicate employee_id → Sequelize unique constraint → 500 with message containing "already"
 */

import fetch from "node-fetch";

const BASE_URL = "https://secureattend-2-0.onrender.com/api";

const employees = [
  { employee_id: "TSI00016", firstname: "Richard",  lastname: "Flores",    email: "richard.flores@company.com",    contact_number: "09171234506", position: "Helper",               department: "Zone B", status: "Active" },
  { employee_id: "TSI00017", firstname: "Michael",  lastname: "Ramos",     email: "michael.ramos@company.com",     contact_number: "09171234507", position: "Picker",               department: "Zone C", status: "Active" },
  { employee_id: "TSI00018", firstname: "Bryan",    lastname: "Cruz",      email: "bryan.cruz@company.com",        contact_number: "09171234508", position: "Reach Truck Operator", department: "Zone D", status: "Active" },
  { employee_id: "TSI00019", firstname: "Arvin",    lastname: "Aquino",    email: "arvin.aquino@company.com",      contact_number: "09171234509", position: "Receiving",            department: "Zone A", status: "Active" },
  { employee_id: "TSI00020", firstname: "Dennis",   lastname: "Villanueva",email: "dennis.villanueva@company.com", contact_number: "09171234510", position: "Supervisor",           department: "Zone B", status: "Active" },
  { employee_id: "TSI00021", firstname: "Jeffrey",  lastname: "Navarro",   email: "jeffrey.navarro@company.com",   contact_number: "09171234511", position: "Team Leader",          department: "Zone C", status: "Active" },
  { employee_id: "TSI00022", firstname: "Carlo",    lastname: "Torres",    email: "carlo.torres@company.com",      contact_number: "09171234512", position: "Warehouse Admin",      department: "Zone D", status: "Active" },
  { employee_id: "TSI00023", firstname: "Ronald",   lastname: "Diaz",      email: "ronald.diaz@company.com",       contact_number: "09171234513", position: "Helper",               department: "Zone A", status: "Active" },
  { employee_id: "TSI00024", firstname: "Edwin",    lastname: "Castillo",  email: "edwin.castillo@company.com",    contact_number: "09171234514", position: "Picker",               department: "Zone B", status: "Active" },
  { employee_id: "TSI00025", firstname: "Noel",     lastname: "Gutierrez", email: "noel.gutierrez@company.com",    contact_number: "09171234515", position: "Reach Truck Operator", department: "Zone C", status: "Active" },
  { employee_id: "TSI00026", firstname: "Allan",    lastname: "Chavez",    email: "allan.chavez@company.com",      contact_number: "09171234516", position: "Receiving",            department: "Zone D", status: "Active" },
  { employee_id: "TSI00027", firstname: "Joseph",   lastname: "Herrera",   email: "joseph.herrera@company.com",    contact_number: "09171234517", position: "Supervisor",           department: "Zone A", status: "Active" },
  { employee_id: "TSI00028", firstname: "Leo",      lastname: "Salazar",   email: "leo.salazar@company.com",       contact_number: "09171234518", position: "Team Leader",          department: "Zone B", status: "Active" },
  { employee_id: "TSI00029", firstname: "Victor",   lastname: "Padilla",   email: "victor.padilla@company.com",    contact_number: "09171234519", position: "Warehouse Admin",      department: "Zone C", status: "Active" },
  { employee_id: "TSI00030", firstname: "Angelo",   lastname: "Dominguez", email: "angelo.dominguez@company.com",  contact_number: "09171234520", position: "Helper",               department: "Zone D", status: "Active" },
  { employee_id: "TSI00031", firstname: "Rodel",    lastname: "Pineda",    email: "rodel.pineda@company.com",      contact_number: "09171234521", position: "Picker",               department: "Zone A", status: "Active" },
  { employee_id: "TSI00032", firstname: "Marvin",   lastname: "Espinoza",  email: "marvin.espinoza@company.com",   contact_number: "09171234522", position: "Reach Truck Operator", department: "Zone B", status: "Active" },
  { employee_id: "TSI00033", firstname: "Gilbert",  lastname: "Soriano",   email: "gilbert.soriano@company.com",   contact_number: "09171234523", position: "Receiving",            department: "Zone C", status: "Active" },
  { employee_id: "TSI00034", firstname: "Ariel",    lastname: "Dela Cruz", email: "ariel.delacruz@company.com",    contact_number: "09171234524", position: "Supervisor",           department: "Zone D", status: "Active" },
  { employee_id: "TSI00035", firstname: "Jun",      lastname: "Alonzo",    email: "jun.alonzo@company.com",        contact_number: "09171234525", position: "Team Leader",          department: "Zone A", status: "Active" },
  { employee_id: "TSI00036", firstname: "Reynaldo", lastname: "Mercado",   email: "reynaldo.mercado@company.com",  contact_number: "09171234526", position: "Warehouse Admin",      department: "Zone B", status: "Active" },
  { employee_id: "TSI00037", firstname: "Danilo",   lastname: "Fajardo",   email: "danilo.fajardo@company.com",    contact_number: "09171234527", position: "Helper",               department: "Zone C", status: "Active" },
  { employee_id: "TSI00038", firstname: "Cesar",    lastname: "Valdez",    email: "cesar.valdez@company.com",      contact_number: "09171234528", position: "Picker",               department: "Zone D", status: "Active" },
  { employee_id: "TSI00039", firstname: "Rogelio",  lastname: "Lim",       email: "rogelio.lim@company.com",       contact_number: "09171234529", position: "Reach Truck Operator", department: "Zone A", status: "Active" },
  { employee_id: "TSI00040", firstname: "Ernesto",  lastname: "Ong",       email: "ernesto.ong@company.com",       contact_number: "09171234530", position: "Receiving",            department: "Zone B", status: "Active" },
  { employee_id: "TSI00041", firstname: "Patrick",  lastname: "Tan",       email: "patrick.tan@company.com",       contact_number: "09171234531", position: "Supervisor",           department: "Zone C", status: "Active" },
  { employee_id: "TSI00042", firstname: "Francis",  lastname: "Go",        email: "francis.go@company.com",        contact_number: "09171234532", position: "Team Leader",          department: "Zone D", status: "Active" },
  { employee_id: "TSI00043", firstname: "Joshua",   lastname: "Co",        email: "joshua.co@company.com",         contact_number: "09171234533", position: "Warehouse Admin",      department: "Zone A", status: "Active" },
  { employee_id: "TSI00044", firstname: "Adrian",   lastname: "Sy",        email: "adrian.sy@company.com",         contact_number: "09171234534", position: "Helper",               department: "Zone B", status: "Active" },
  { employee_id: "TSI00045", firstname: "Jerome",   lastname: "Chua",      email: "jerome.chua@company.com",       contact_number: "09171234535", position: "Picker",               department: "Zone C", status: "Active" },
];

async function seed() {
  let created = 0;
  let skipped = 0;
  let failed  = 0;

  console.log(`� Seeding ${employees.length} employees to ${BASE_URL}\n`);

  for (const emp of employees) {
    try {
      const res  = await fetch(`${BASE_URL}/employees`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(emp),
      });

      const text = await res.text();
      let body;
      try { body = JSON.parse(text); } catch { body = { raw: text }; }

      if (res.status === 201) {
        console.log(`✅ Created   ${emp.employee_id}  ${emp.firstname} ${emp.lastname}`);
        created++;
      } else {
        // Check if it's a duplicate (unique constraint error)
        const msg = (body?.message || body?.error || "").toLowerCase();
        if (msg.includes("already") || msg.includes("unique") || msg.includes("duplicate")) {
          console.log(`⏭  Skipped   ${emp.employee_id}  (already exists)`);
          skipped++;
        } else {
          console.warn(`⚠️  Failed    ${emp.employee_id}  [${res.status}]  ${JSON.stringify(body)}`);
          failed++;
        }
      }
    } catch (err) {
      console.error(`❌ Error     ${emp.employee_id}  →  ${err.message}`);
      failed++;
    }
  }

  console.log("\n─────────────────────────────────────────────────");
  console.log(`Done.  ✅ Created: ${created}  |  ⏭ Skipped: ${skipped}  |  ❌ Failed: ${failed}`);
}

seed().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
