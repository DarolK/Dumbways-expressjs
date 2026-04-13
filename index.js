import express from "express";
import { engine } from "express-handlebars";
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";

const app = express();
const port = 3000;

// ==========================================
// 1. Konfigurasi Database PostgreSQL
// ==========================================
const { Pool } = pg;
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

// ==========================================
// 2. Middleware & Setup Handlebars
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/assets", express.static("./src/assets"));

// Konfigurasi Session
app.use(session({
  name: 'MinahasaCodeSession',
  secret: 'secretkey123', 
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 jam
}));

// Middleware agar data login bisa diakses di semua view (.hbs)
app.use((req, res, next) => {
  res.locals.isLogin = req.session.isLogin;
  res.locals.user = req.session.user;
  next();
});

// Helper Middleware untuk proteksi route
const auth = (req, res, next) => {
  if (!req.session.isLogin) {
    return res.redirect('/login');
  }
  next();
};

app.engine("hbs", engine({
  extname: "hbs",
  defaultLayout: "main",
  layoutsDir: "./src/views/layouts",
  partialsDir: "./src/views/partials",
}));

app.set("view engine", "hbs");
app.set("views", "./src/views");

// ==========================================
// 3. Routing Autentikasi
// ==========================================
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.render("register", { 
        title: "Register", 
        error_msg: "Semua kolom harus diisi!" 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
      [name, email, hashedPassword]
    );

   
    res.render("login", { 
      title: "Login", 
      success_msg: "Akun berhasil dibuat! Silakan login." 
    });

  } catch (err) {
    console.error(err); 
    res.render("register", { 
      title: "Register",
      error_msg: "Email sudah terdaftar." 
    });
  }
});

app.get("/register", (req, res) => {
    res.render("register", { title: "Register" });
});

app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
            [name, email, hashedPassword]
        );

        res.render("login", { 
            title: "Login", 
            success_msg: "Akun berhasil dibuat! Silakan login." 
        });
    } catch (err) {
      
        res.render("register", { 
            title: "Register",
            error_msg: "Email sudah terdaftar!" 
        });
    }
});

app.get("/login", (req, res) => res.render("login", { title: "Login" }));

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) return res.render("login", { error_msg: "User tidak ditemukan" });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.render("login", { error_msg: "Invalid Email or Password" });

    req.session.isLogin = true;
    req.session.user = { id: user.id, name: user.name };
    res.redirect("/project");
  } catch (err) {
    res.status(500).send("Login Error");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// ==========================================
// 4. Routing Dasar (Public)
// ==========================================
app.get("/", (req, res) => res.render("home", { title: "MinahasaCode" }));
app.get("/home", (req, res) => res.render("home", { title: "MinahasaCode" }));
app.get("/contact", (req, res) => res.render("contact", { title: "Contact Me" }));

// ==========================================
// 5. Routing Proyek (CRUD + Auth)
// ==========================================

app.get("/project", async (req, res) => {
  try {
    const { id } = req.query;
    let selectedProject = null;

    // Hanya ambil data edit jika user sedang login
    if (id && req.session.isLogin) {
      const editResult = await pool.query("SELECT * FROM projects WHERE id = $1", [id]);
      selectedProject = editResult.rows[0];
    }

    const result = await pool.query("SELECT * FROM projects ORDER BY id DESC");
    const techResult = await pool.query("SELECT * FROM technologies");

    res.render("project", {
      title: "My Projects",
      projects: result.rows,
      allTechnologies: techResult.rows,
      selectedProject: selectedProject
    });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// Tambah & Update diproteksi 'auth'
app.post("/my-projects", auth, async (req, res) => {
  const { id, name, description, technologies } = req.body; 
  const author_id = req.session.user.id; 
  
  try {
    if (id) {
      await pool.query(
        "UPDATE projects SET name = $1, description = $2 WHERE id = $3",
        [name, description, id]
      );
    } else {
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
    }
    res.redirect('/project');
  } catch (error) {
    res.status(500).send("Gagal memproses project");
  }
});


app.delete("/project/:id", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM projects WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Gagal hapus' });
  }
});

// Detail Proyek 
app.get("/project-detail/:id", async (req, res) => {
  const { id } = req.params; 
  try {
    const result = await pool.query("SELECT * FROM projects WHERE id = $1", [id]);
    const project = result.rows[0];

    if (!project) return res.status(404).send("Proyek tidak ditemukan");

    const techResult = await pool.query(`
      SELECT t.name FROM technologies t
      JOIN project_technologies pt ON t.id = pt.tech_id
      WHERE pt.project_id = $1
    `, [id]);
    
    res.render('project-detail', { 
      title: project.name,
      project, 
      technologies: techResult.rows
    });
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});