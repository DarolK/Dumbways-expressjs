// index js
import express from "express";
import { engine } from "express-handlebars";

const app = express();
const port = 3000;

// Handlebars Configuration
app.engine(
  "hbs",
  engine({
    extname: "hbs",
    defaultLayout: "main",
    layoutsDir: "./src/views/layouts",
    partialsDir: "./src/views/partials",
  }),
);

app.set("view engine", "hbs");
app.set("views", "./src/views");

// Static Files (CSS, Images, etc.)
app.use("/assets", express.static("./src/assets"));

// --- ROUTING ---
app.get("/", (req, res) => {
  res.render("home", { title: "MinahasaCode" });
});

app.get("/home", (req, res) => {
  res.render("home", { title: "MinahasaCode" });
});

app.get("/contact", (req, res) => {
  res.render("contact", { title: "MinahasaCode" });
});

app.get("/project", (req, res) => {
  res.render("project", { title: "MinahasaCode" });
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});