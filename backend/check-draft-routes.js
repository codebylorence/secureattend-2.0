import express from "express";

// Check if the routes file exists and can be imported
console.log("🔍 Checking draft routes...\n");

try {
  const scheduleDraftRoutes = await import("./routes/scheduleDraftRoutes.js");
  console.log("✅ scheduleDraftRoutes.js exists and can be imported");
  console.log("   Default export:", typeof scheduleDraftRoutes.default);
  
  const scheduleDraftController = await import("./controllers/scheduleDraftController.js");
  console.log("✅ scheduleDraftController.js exists");
  console.log("   Exports:", Object.keys(scheduleDraftController).join(", "));
  
  const scheduleDraftService = await import("./services/scheduleDraftService.js");
  console.log("✅ scheduleDraftService.js exists");
  console.log("   Exports:", Object.keys(scheduleDraftService).join(", "));
  
  const ScheduleDraft = await import("./models/scheduleDraft.js");
  console.log("✅ scheduleDraft.js model exists");
  
  console.log("\n✅ All draft files are present and importable!");
  console.log("\n⚠️  If the API still doesn't work, the backend needs to be RESTARTED!");
  console.log("   Run: npm start");
  
  process.exit(0);
} catch (error) {
  console.error("❌ Error:", error.message);
  console.error("\nStack:", error.stack);
  process.exit(1);
}
