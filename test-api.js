async function test() {
  console.log("Fetching /api/auth/sync...");
  try {
    const res = await fetch("https://gestao-ctos-clean.vercel.app/api/auth/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: "dummy" })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}
test();
