const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let reports = [];

app.post("/reports", (req, res) => {
    reports.push(req.body);

    console.log("---- NEW REPORT RECEIVED ----");
    console.log(req.body);
    console.log("Total reports:", reports.length);

    res.json({ success: true });
});

app.get("/reports", (req, res) => {
    res.json(reports);
});

app.listen(5000, () => {
    console.log("Backend running at http://localhost:5000");
});
