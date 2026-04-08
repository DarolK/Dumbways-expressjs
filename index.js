// index js
import express from "express";
import { engine } from "express-handlebars";

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({extended: true}));

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

// In-memory data storage for projects
let projects = [
  {
    id: 1,
    name: "Personal Portfolio Website",
    description: "A responsive portfolio website built with Express.js and Handlebars"
  },
  {
    id: 2,
    name: "E-commerce Platform",
    description: "Full-stack e-commerce solution with payment integration"
  }
];

// Helper function to generate next ID
const getNextId = () => {
  const maxId = projects.length > 0 ? Math.max(...projects.map(({ id }) => id)) : 0;
  return maxId + 1;
};

// --- ROUTING ---

// Home routes
app.get("/", (req, res) => {
  res.render("home", { title: "MinahasaCode" });
});

app.get("/home", (req, res) => {
  res.render("home", { title: "MinahasaCode" });
});

// Contact routes
app.get("/contact", (req, res) => {
  res.render("contact", { title: "MinahasaCode" });
});

app.post("/contact", (req, res) => {
  const { name, email, message } = req.body;
  console.log(`Received contact form submission: Name=${name}, Email=${email}, Message=${message}`);

  // Redirect to thank you page
  res.redirect('/thank-you');
});

app.get('/thank-you', (req, res) => {
  res.send('Thank you for contacting me!');
});

// Project routes

// GET /project - Display project form and list, or project detail if id query param is provided
app.get("/project", (req, res) => {
  const { id } = req.query;
  let selectedProject = null;

  if (id) {
    const projectId = parseInt(id);
    selectedProject = projects.find(({ id: projId }) => projId === projectId);
  }

  res.render("project", {
    title: selectedProject ? `Project: ${selectedProject.name}` : "My Projects",
    projects: projects,
    selectedProject: selectedProject
  });
});

// POST /my-projects - Create new project (CREATE)
app.post("/my-projects", (req, res) => {
  const { name, description } = req.body;

  const newProject = {
    id: getNextId(),
    name,
    description
  };

  projects.push(newProject);
  console.log(`New project added: ${JSON.stringify(newProject)}`);

  res.redirect('/project');
});

// PUT /project/:id - Update project (UPDATE)
app.put("/project/:id", (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const projectId = parseInt(id);

  const projectIndex = projects.findIndex(({ id: projId }) => projId === projectId);

  if (projectIndex === -1) {
    return res.status(404).json({ error: 'Project not found' });
  }

  projects[projectIndex] = {
    ...projects[projectIndex],
    name,
    description
  };

  console.log(`Project updated: ${JSON.stringify(projects[projectIndex])}`);
  res.json({ success: true, project: projects[projectIndex] });
});

// DELETE /project/:id - Delete project (DELETE)
app.delete("/project/:id", (req, res) => {
  const { id } = req.params;
  const projectId = parseInt(id);

  const initialLength = projects.length;
  projects = projects.filter(({ id: projId }) => projId !== projectId);

  if (projects.length === initialLength) {
    return res.status(404).json({ error: 'Project not found' });
  }

  console.log(`Project with id ${projectId} deleted`);
  res.json({ success: true, message: 'Project deleted successfully' });
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});