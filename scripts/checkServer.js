import axios from "axios";

async function check() {
  try {
    const res = await axios.get("http://127.0.0.1:5000/health");
    console.log("Server reachable:", res.data);
  } catch (err) {
    console.error("Server NOT reachable", err.message);
  }
}

check();

