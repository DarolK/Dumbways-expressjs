import express from "express";
import { engine } from "express-handlebars";
import pg from "pg";

const app = express();
const port = 3000;

const { Pool } = pg;

// ==========================================
// Konfigurasi Database PostgreSQL
// ==========================================
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'portofolio_db.',
  password: 'admin', 
  port: 9999, 
});

pool.connect((err) => {
  if (err) {
    console.error('Koneksi ke Database Gagal:', err.stack);
  } else {
    console.log('Berhasil terhubung ke database PostgreSQL');
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handlebars Configuration
app.engine(
  "hbs",
  engine({
    extname: "hbs",
    defaultLayout: "main",
    layoutsDir: "./src/views/layouts",
    partialsDir: "./src/views/partials",
    helpers: {
      // Helper untuk mengecek checkbox jika diperlukan nanti
      includes: (array, value) => array && array.includes(value)
    }
  }),
);

app.set("view engine", "hbs");
app.set("views", "./src/views");
app.use("/assets", express.static("./src/assets"));

// ==========================================
// --- ROUTING ---
// ==========================================

app.get("/", (req, res) => res.render("home", { title: "MinahasaCode" }));
app.get("/home", (req, res) => res.render("home", { title: "MinahasaCode" }));

// Contact Routes
app.get("/contact", (req, res) => {
  res.render("contact", { title: "Contact Me" });
});

app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    await pool.query(
      "INSERT INTO messages (name, email, message) VALUES ($1, $2, $3)",
      [name, email, message]
    );
    
    res.render("contact", { 
      title: "Contact Me", 
      success_msg: "Pesan Anda berhasil terkirim!" 
    });
  } catch (error) {
    console.error(error);
    res.render("contact", { 
      title: "Contact Me", 
      error_msg: "Maaf, terjadi kesalahan. Silakan coba lagi." 
    });
  }
});

// ==========================================
// Project Routes (Relational)
// ==========================================

app.get("/project", async (req, res) => {
  const { id } = req.query;
  
  try {
    // Ambil semua project dengan JOIN ke user
    const projectsRes = await pool.query(`
      SELECT projects.*, users.username AS author_name 
      FROM projects 
      LEFT JOIN users ON projects.author_id = users.id 
      ORDER BY projects.id DESC
    `);

    //Ambil semua teknologi untuk checkbox di form
    const techRes = await pool.query("SELECT * FROM technologies");

    let selectedProject = null;
    if (id) {
      const selectedRes = await pool.query(`
        SELECT projects.*, users.username AS author_name 
        FROM projects 
        LEFT JOIN users ON projects.author_id = users.id 
        WHERE projects.id = $1`, [id]);
      selectedProject = selectedRes.rows[0];
    }

    res.render("project", {
      title: selectedProject ? `Project: ${selectedProject.name}` : "My Projects",
      projects: projectsRes.rows,
      allTechnologies: techRes.rows,
      selectedProject: selectedProject
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/my-projects", async (req, res) => {
  const { name, description, technologies } = req.body; 
  
  
  const author_id = 1; 
  try {
    //  Insert ke tabel projects
    const projectRes = await pool.query(
      "INSERT INTO projects (name, description, author_id) VALUES ($1, $2, $3) RETURNING id",
      [name, description, author_id]
    );

    const projectId = projectRes.rows[0].id;

    // Insert ke tabel jembatan project_technologies
    if (technologies) {
      // Jika hanya satu checkbox yang dipilih, Express mengirim string, bukan array
      const techArray = Array.isArray(technologies) ? technologies : [technologies];
      
      for (const techId of techArray) {
        await pool.query(
          "INSERT INTO project_technologies (project_id, tech_id) VALUES ($1, $2)",
          [projectId, techId]
        );
      }
    }

    res.redirect('/project');
  } catch (error) {
    console.error(error);
    res.status(500).send("Gagal menambah project");
  }
});

// Update Project
app.put("/project/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    await pool.query(
      "UPDATE projects SET name = $1, description = $2 WHERE id = $3",
      [name, description, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Gagal update' });
  }
});

// Delete Project
app.delete("/project/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM projects WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Gagal hapus' });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});