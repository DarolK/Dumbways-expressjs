import express from "express";
import { engine } from "express-handlebars";
import pg from "pg";

const app = express();
const port = 3000;

// ==========================================
// 1. Konfigurasi Database PostgreSQL
// ==========================================
const { Pool } = pg;
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'portofolio_db.', // Removed the trailing period
  password: 'admin', 
  port: 9999, 
});

pool.connect((err) => {
  if (err) {
    console.error('Koneksi ke Database Gagal:', err.stack);
  } else {
    console.log('Berhasil terhubung ke database PostgreSQL portofolio_db');
  }
});

// ==========================================
// 2. Middleware & Setup Handlebars
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/assets", express.static("./src/assets"));

app.engine("hbs", engine({
  extname: "hbs",
  defaultLayout: "main",
  layoutsDir: "./src/views/layouts",
  partialsDir: "./src/views/partials",
}));

app.set("view engine", "hbs");
app.set("views", "./src/views");

// ==========================================
// 3. Routing Dasar (Home & Contact)
// ==========================================
app.get("/", (req, res) => res.render("home", { title: "MinahasaCode" }));
app.get("/home", (req, res) => res.render("home", { title: "MinahasaCode" }));

app.get("/contact", (req, res) => res.render("contact", { title: "Contact Me" }));

app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;
  try {
    await pool.query("INSERT INTO messages (name, email, message) VALUES ($1, $2, $3)", [name, email, message]);
    res.render("contact", { title: "Contact Me", success_msg: "Pesan terkirim!" });
  } catch (error) {
    res.render("contact", { title: "Contact Me", error_msg: "Terjadi kesalahan." });
  }
});

// ==========================================
// 4. Routing Proyek (CRUD)
// ==========================================

// Menampilkan semua proyek & form tambah/edit
app.get("/project", async (req, res) => {
  try {
    const { id } = req.query; // Tangkap ID jika sedang mode Edit
    let selectedProject = null;

    // Jika ada ID di URL (?id=1), ambil data project tersebut untuk di-edit
    if (id) {
      const editResult = await pool.query("SELECT * FROM projects WHERE id = $1", [id]);
      selectedProject = editResult.rows[0];
    }

    // Ambil semua project untuk list
    const result = await pool.query("SELECT * FROM projects ORDER BY id DESC");
    
    // Ambil semua teknologi untuk pilihan checkbox
    const techResult = await pool.query("SELECT * FROM technologies");

    res.render("project", {
      title: "My Projects",
      projects: result.rows,
      allTechnologies: techResult.rows,
      selectedProject: selectedProject
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Menambah atau mengedit proyek
app.post("/my-projects", async (req, res) => {
  const { id, name, description, technologies } = req.body; 
  
  const author_id = 1; 
  
  try {
    if (id) {
      // Mode Edit (Update data)
      await pool.query(
        "UPDATE projects SET name = $1, description = $2 WHERE id = $3",
        [name, description, id]
      );
      console.log("Berhasil update project");
    } else {
      // Mode Tambah (Insert data)
      const projectRes = await pool.query(
        "INSERT INTO projects (name, description, author_id) VALUES ($1, $2, $3) RETURNING id",
        [name, description, author_id]
      );

      const projectId = projectRes.rows[0].id;

      if (technologies) {
        const techArray = Array.isArray(technologies) ? technologies : [technologies];
        for (const techId of techArray) {
          await pool.query(
            "INSERT INTO project_technologies (project_id, tech_id) VALUES ($1, $2)",
            [projectId, techId]
          );
        }
      }
      console.log("Berhasil input data project baru");
    }
    res.redirect('/project');
  } catch (error) {
    console.error(error);
    res.status(500).send("Gagal memproses project");
  }
});

// ==========================================
// 5. Routing DETAIL PROYEK
// ==========================================
app.get("/project-detail/:id", async (req, res) => {
  const { id } = req.params; 

  try {
    // 1. Ambil data project
    const result = await pool.query("SELECT * FROM projects WHERE id = $1", [id]);
    const project = result.rows[0];

    if (!project) {
      return res.status(404).send("Proyek tidak ditemukan");
    }

    // 2. Ambil data teknologi yang berelasi dengan project ini
    const techResult = await pool.query(`
      SELECT t.name 
      FROM technologies t
      JOIN project_technologies pt ON t.id = pt.tech_id
      WHERE pt.project_id = $1
    `, [id]);
    
    const technologies = techResult.rows;

    // 3. Render halaman dan kirim data yang sudah diperbaiki
    res.render('project-detail', { 
      title: project.name,
      project: project, 
      technologies: technologies,
      author_id: project.author_id 
    });

  } catch (error) {
    console.error("Error mengambil detail:", error);
    res.status(500).send("Server Error");
  }
});

// Route Delete
app.delete("/project/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM projects WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Gagal hapus:", error);
    res.status(500).json({ error: 'Gagal hapus' });
  }
});

// ==========================================
// Jalankan Server
// ==========================================
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});