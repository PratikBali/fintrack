const functions = require("firebase-functions");

exports.health = functions.https.onRequest((req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  res.json({
    status: "ok",
    service: "fintrack-pro",
    platform: "firebase-functions",
    timestamp: new Date().toISOString(),
  });
});
