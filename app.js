import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

// ========================================
// 1. FIREBASE & CLOUDINARY CONFIGURATION
// ========================================

const firebaseConfig = {
  apiKey: 'AIzaSyBHaRiIewSKJRjweUii_SHZsp5BKg8hypA', //[cite: 5]
  authDomain: 'portfolio-manager-c947f.firebaseapp.com', //[cite: 5]
  projectId: 'portfolio-manager-c947f', //[cite: 5]
  storageBucket: 'portfolio-manager-c947f.firebasestorage.app', //[cite: 5]
  messagingSenderId: '440452555489', //[cite: 5]
  appId: '1:440452555489:web:5e67eb1f9a39a3c83d4da0', //[cite: 5]
  measurementId: 'G-QLH8XRL6D7' //[cite: 5]
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const categoriesCol = collection(db, 'categories');
const projectsCol = collection(db, 'projects');

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'b01elm7w'; //[cite: 7]
const CLOUDINARY_UPLOAD_PRESET = 'a little monkey need money'; //[cite: 7]


// ========================================
// 2. GET HTML ELEMENTS
// ========================================

const form = document.querySelector('#project-form'); //[cite: 7, 8]
const formTitle = document.querySelector('#form-title'); //[cite: 7, 8]

const idInput = document.querySelector('#project-id'); //[cite: 7, 8]
const titleInput = document.querySelector('#title'); //[cite: 7, 8]
const yearInput = document.querySelector('#year'); //[cite: 7, 8]
const categoryInput = document.querySelector('#category'); //[cite: 7, 8]
const descriptionInput = document.querySelector('#description'); //[cite: 7, 8]
const tagsInput = document.querySelector('#tags'); //[cite: 7, 8]
const linkInput = document.querySelector('#link'); //[cite: 7, 8]
const imageInput = document.querySelector('#image'); //[cite: 7, 8]
const imageFileInput = document.querySelector('#image-file'); //[cite: 7, 8]
const featuredInput = document.querySelector('#featured'); //[cite: 7, 8]

const cancelBtn = document.querySelector('#cancel-btn'); //[cite: 7, 8]

const searchInput = document.querySelector('#search'); //[cite: 7, 8]
const filterSelect = document.querySelector('#filter'); //[cite: 7, 8]

const listEl = document.querySelector('#project-list'); //[cite: 7, 8]
const countEl = document.querySelector('#count'); //[cite: 7, 8]

const clearAllBtn = document.querySelector('#clear-all-btn'); //[cite: 7, 8]
const exportBtn = document.querySelector('#export-btn'); //[cite: 7, 8]
const importBtn = document.querySelector('#import-btn'); //[cite: 7, 8]
const importFile = document.querySelector('#import-file'); //[cite: 7, 8]

const categoryForm = document.querySelector('#category-form'); //[cite: 7, 8]
const categoryNameInput = document.querySelector('#category-name'); //[cite: 7, 8]
const categoryList = document.querySelector('#category-list'); //[cite: 7, 8]


// ========================================
// 3. HELPER FUNCTIONS
// ========================================

function escapeHTML(value = '') { //[cite: 7]
  return String(value) //[cite: 7]
    .replaceAll('&', '&amp;') //[cite: 7]
    .replaceAll('<', '&lt;') //[cite: 7]
    .replaceAll('>', '&gt;') //[cite: 7]
    .replaceAll('"', '&quot;') //[cite: 7]
    .replaceAll("'", '&#039;'); //[cite: 7]
}

function isSafeHttpUrl(value) { //[cite: 7]
  try {
    const url = new URL(value); //[cite: 7]
    return url.protocol === 'http:' || url.protocol === 'https:'; //[cite: 7]
  } catch {
    return false; //[cite: 7]
  }
}


// ========================================
// 3A. UPLOAD IMAGE TO CLOUDINARY
// ========================================

async function uploadImage(file) { //[cite: 7]
  if (!file.type.startsWith('image/')) { //[cite: 7]
    throw new Error('Please select a valid image file.'); //[cite: 7]
  }

  if (file.size > 10 * 1024 * 1024) { //[cite: 7]
    throw new Error('Image must be smaller than 10 MB.'); //[cite: 7]
  }

  const formData = new FormData(); //[cite: 7]
  formData.append('file', file); //[cite: 7]
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET); //[cite: 7]
  formData.append('folder', 'portfolio'); //[cite: 7]

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, //[cite: 7]
    {
      method: 'POST', //[cite: 7]
      body: formData //[cite: 7]
    }
  );

  const result = await response.json(); //[cite: 7]

  if (!response.ok) { //[cite: 7]
    throw new Error(result.error?.message || 'Image upload failed.'); //[cite: 7]
  }

  return result.secure_url; //[cite: 7]
}


// ========================================
// 4. FIRESTORE CATEGORIES
// ========================================

async function fetchCategories() {
  const snapshot = await getDocs(categoriesCol);
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    name: docSnap.data().name || ''
  }));
}

async function loadCategories(selectedId = '') { //[cite: 7]
  const categories = await fetchCategories();

  categoryInput.innerHTML = '<option value="">Choose a category...</option>'; //[cite: 7]
  filterSelect.innerHTML = '<option value="All">All categories</option>'; //[cite: 7]

  categories.forEach(category => { //[cite: 7]
    categoryInput.add(new Option(category.name, category.id)); //[cite: 7]
    filterSelect.add(new Option(category.name, category.id)); //[cite: 7]
  });

  if (selectedId) { //[cite: 7]
    categoryInput.value = String(selectedId); //[cite: 7]
  }

  renderCategories(categories); //[cite: 7]
  return categories;
}


// ========================================
// 5. DISPLAY SAVED CATEGORIES
// ========================================

function renderCategories(categories) { //[cite: 7]
  if (categories.length === 0) { //[cite: 7]
    categoryList.innerHTML = '<li>No categories available.</li>'; //[cite: 7]
    return;
  }

  categoryList.innerHTML = categories //[cite: 7]
    .map(category => `<li>${escapeHTML(category.name)}</li>`) //[cite: 7]
    .join('');
}


// ========================================
// 6. ADD NEW CATEGORY
// ========================================

categoryForm.addEventListener('submit', async event => { //[cite: 7]
  event.preventDefault(); //[cite: 7]

  const name = categoryNameInput.value.trim(); //[cite: 7]
  if (!name) return; //[cite: 7]

  try {
    const existing = await fetchCategories();
    const duplicate = existing.some(
      cat => cat.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      throw new Error('Category already exists.');
    }

    await addDoc(categoriesCol, {
      name,
      createdAt: serverTimestamp()
    });

    await loadCategories(); //[cite: 7]
    categoryForm.reset(); //[cite: 7]
    alert('Category added successfully!'); //[cite: 7]
  } catch (error) {
    alert(error.message); //[cite: 7]
  }
});


// ========================================
// 7. READ PROJECT FORM DATA
// ========================================

function readForm() { //[cite: 7]
  return {
    title: titleInput.value.trim(), //[cite: 7]
    year: Number(yearInput.value), //[cite: 7]
    categoryId: categoryInput.value, //[cite: 7]
    description: descriptionInput.value.trim(), //[cite: 7]
    tags: tagsInput.value //[cite: 7]
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean),
    link: linkInput.value.trim(), //[cite: 7]
    image: imageInput.value.trim(), //[cite: 7]
    featured: featuredInput.checked //[cite: 7]
  };
}


// ========================================
// 8. CREATE PROJECT
// ========================================

async function createProject(data) { //[cite: 7]
  return addDoc(projectsCol, {
    ...data,
    createdAt: serverTimestamp()
  });
}


// ========================================
// 9. GET PROJECTS
// ========================================

async function fetchAllProjects() {
  const snapshot = await getDocs(projectsCol);
  return snapshot.docs.map(docSnap => {
    const raw = docSnap.data();
    return {
      ...raw,
      id: docSnap.id,
      categoryId: raw.categoryId ? String(raw.categoryId) : '',
      createdAt: raw.createdAt?.toMillis ? raw.createdAt.toMillis() : raw.createdAt ?? null
    };
  });
}

async function getProjects() { //[cite: 7]
  const projects = await fetchAllProjects();
  const categoryId = filterSelect.value; //[cite: 7]
  const searchText = searchInput.value.trim().toLowerCase(); //[cite: 7]

  return projects //[cite: 7]
    .filter(project => categoryId === 'All' || project.categoryId === categoryId) //[cite: 7]
    .filter(project => {
      const titleMatch = (project.title || '').toLowerCase().includes(searchText); //[cite: 7]
      const tagMatch = (project.tags || []).some(tag =>
        String(tag).toLowerCase().includes(searchText) //[cite: 7]
      );
      return titleMatch || tagMatch; //[cite: 7]
    })
    .sort((a, b) => (b.year || 0) - (a.year || 0)); //[cite: 7]
}


// ========================================
// 10. DISPLAY PROJECTS
// ========================================

async function render() { //[cite: 7]
  try {
    const [projects, categories] = await Promise.all([
      getProjects(), //[cite: 7]
      fetchCategories()
    ]);

    countEl.textContent = `${projects.length} project(s)`; //[cite: 7]

    if (projects.length === 0) { //[cite: 7]
      listEl.innerHTML = '<p class="empty">No projects yet.</p>'; //[cite: 7]
      return;
    }

    listEl.innerHTML = projects //[cite: 7]
      .map(project => {
        const category = categories.find(item => item.id === project.categoryId); //[cite: 7]

        const tags = (project.tags || []) //[cite: 7]
          .map(tag => `<span>#${escapeHTML(tag)}</span>`) //[cite: 7]
          .join('');

        const imageHTML =
          project.image && isSafeHttpUrl(project.image) //[cite: 7]
            ? `
              <img
                src="${escapeHTML(project.image)}"
                alt="${escapeHTML(project.title)}"
                class="project-thumbnail"
                loading="lazy"
              />
            ` //[cite: 7]
            : '';

        const linkHTML =
          project.link && isSafeHttpUrl(project.link) //[cite: 7]
            ? `
              <a
                href="${escapeHTML(project.link)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                View project
              </a>
            ` //[cite: 7]
            : '';

        return `
          <article class="project">

            <span class="badge">
              ${escapeHTML(category?.name || project.category || 'Unknown')}
            </span>

            ${imageHTML}

            <h3>
              ${project.featured ? '⭐ ' : ''}
              ${escapeHTML(project.title)}
            </h3>

            <p>
              <strong>Year:</strong>
              ${project.year || 'Not specified'}
            </p>

            <p>
              ${escapeHTML(project.description || '')}
            </p>

            <p class="tags">${tags}</p>

            ${linkHTML}

            <div class="actions">

              <button
                data-action="edit"
                data-id="${escapeHTML(project.id)}"
              >
                Edit
              </button>

              <button
                data-action="delete"
                data-id="${escapeHTML(project.id)}"
                class="danger"
              >
                Delete
              </button>

            </div>

          </article>
        `; //[cite: 7]
      })
      .join('');
  } catch (error) {
    console.error('Display error:', error); //[cite: 7]
    listEl.innerHTML =
      '<p class="empty">Unable to load projects from Firestore. Check your connection and Firestore rules.</p>';
  }
}


// ========================================
// 11. UPDATE PROJECT
// ========================================

async function updateProject(id, data) { //[cite: 7]
  const projectRef = doc(db, 'projects', id);
  return updateDoc(projectRef, data);
}


// ========================================
// 12. EDIT PROJECT
// ========================================

function startEdit(project) { //[cite: 7]
  idInput.value = project.id; //[cite: 7]
  titleInput.value = project.title || ''; //[cite: 7]
  yearInput.value = project.year ?? ''; //[cite: 7]
  categoryInput.value = project.categoryId || ''; //[cite: 7]
  descriptionInput.value = project.description || ''; //[cite: 7]
  tagsInput.value = (project.tags || []).join(', '); //[cite: 7]
  linkInput.value = project.link || ''; //[cite: 7]
  imageInput.value = project.image || ''; //[cite: 7]
  featuredInput.checked = Boolean(project.featured); //[cite: 7]
  imageFileInput.value = ''; //[cite: 7]

  formTitle.textContent = 'Edit project'; //[cite: 7]
  cancelBtn.hidden = false; //[cite: 7]

  window.scrollTo({
    top: 0, //[cite: 7]
    behavior: 'smooth' //[cite: 7]
  });
}


// ========================================
// 13. RESET FORM
// ========================================

function resetForm() { //[cite: 7]
  form.reset(); //[cite: 7]
  idInput.value = ''; //[cite: 7]
  formTitle.textContent = 'Add a project'; //[cite: 7]
  cancelBtn.hidden = true; //[cite: 7]
}


// ========================================
// 14. DELETE PROJECT
// ========================================

async function deleteProject(id) { //[cite: 7]
  const projectRef = doc(db, 'projects', id);
  return deleteDoc(projectRef);
}


// ========================================
// 15. SUBMIT PROJECT FORM
// ========================================

form.addEventListener('submit', async event => { //[cite: 7]
  event.preventDefault(); //[cite: 7]

  try {
    const data = readForm(); //[cite: 7]
    const id = idInput.value; //[cite: 7]

    const imageFile = imageFileInput.files[0]; //[cite: 7]
    if (imageFile) { //[cite: 7]
      data.image = await uploadImage(imageFile); //[cite: 7]
    }

    if (id) { //[cite: 7]
      await updateProject(id, data); //[cite: 7]
    } else {
      await createProject(data); //[cite: 7]
    }

    resetForm(); //[cite: 7]
    await render(); //[cite: 7]
    alert('Project saved successfully!'); //[cite: 7]
  } catch (error) {
    console.error('Save error:', error); //[cite: 7]
    alert(error.message); //[cite: 7]
  }
});


// ========================================
// 16. EDIT AND DELETE BUTTONS
// ========================================

listEl.addEventListener('click', async event => { //[cite: 7]
  const button = event.target.closest('button[data-action]'); //[cite: 7]
  if (!button) return; //[cite: 7]

  const id = button.dataset.id; //[cite: 7]

  try {
    if (button.dataset.action === 'edit') { //[cite: 7]
      const projects = await fetchAllProjects();
      const project = projects.find(item => item.id === id); //[cite: 7]
      if (project) { //[cite: 7]
        startEdit(project); //[cite: 7]
      }
    }

    if (button.dataset.action === 'delete') { //[cite: 7]
      const confirmed = confirm('Are you sure you want to delete this project?'); //[cite: 7]
      if (!confirmed) return; //[cite: 7]

      await deleteProject(id); //[cite: 7]
      await render(); //[cite: 7]
    }
  } catch (error) {
    alert(error.message); //[cite: 7]
  }
});


// ========================================
// 17. SEARCH AND FILTER
// ========================================

cancelBtn.addEventListener('click', resetForm); //[cite: 7]
searchInput.addEventListener('input', render); //[cite: 7]
filterSelect.addEventListener('change', render); //[cite: 7]


// ========================================
// 18. CLEAR ALL PROJECTS
// ========================================

clearAllBtn.addEventListener('click', async () => { //[cite: 7]
  const confirmed = confirm('Are you sure you want to delete ALL projects?'); //[cite: 7]
  if (!confirmed) return; //[cite: 7]

  try {
    const snapshot = await getDocs(projectsCol);
    const batch = writeBatch(db);
    snapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));
    await batch.commit();

    resetForm(); //[cite: 7]
    await render(); //[cite: 7]
    alert('All projects have been cleared!'); //[cite: 7]
  } catch (error) {
    alert(error.message); //[cite: 7]
  }
});


// ========================================
// 19. EXPORT PROJECTS AS JSON
// ========================================

exportBtn.addEventListener('click', async () => { //[cite: 7]
  try {
    const projects = await fetchAllProjects();

    if (projects.length === 0) { //[cite: 7]
      alert('No projects available to export!'); //[cite: 7]
      return;
    }

    const blob = new Blob([JSON.stringify(projects, null, 2)], { //[cite: 7]
      type: 'application/json' //[cite: 7]
    });

    const url = URL.createObjectURL(blob); //[cite: 7]
    const downloadLink = document.createElement('a'); //[cite: 7]
    downloadLink.href = url; //[cite: 7]
    downloadLink.download = 'portfolio-projects.json'; //[cite: 7]
    downloadLink.click(); //[cite: 7]
    URL.revokeObjectURL(url); //[cite: 7]
  } catch (error) {
    alert(error.message); //[cite: 7]
  }
});


// ========================================
// 20. IMPORT PROJECTS FROM JSON
// ========================================

importBtn.addEventListener('click', () => { //[cite: 7]
  importFile.click(); //[cite: 7]
});

importFile.addEventListener('change', async () => { //[cite: 7]
  const file = importFile.files[0]; //[cite: 7]
  if (!file) return; //[cite: 7]

  try {
    const text = await file.text(); //[cite: 7]
    const importedProjects = JSON.parse(text); //[cite: 7]

    if (!Array.isArray(importedProjects)) { //[cite: 7]
      throw new Error('Invalid JSON format.'); //[cite: 7]
    }

    if (importedProjects.length === 0) { //[cite: 7]
      alert('The selected file contains no projects.'); //[cite: 7]
      return;
    }

    const confirmed = confirm(`Import ${importedProjects.length} project(s)?`); //[cite: 7]
    if (!confirmed) return; //[cite: 7]

    const oldCategoriesById = new Map([
      ['6aff2aa5afe3492a69060b19', 'Web'],
      ['6aff2aa5afe3492a69060b1a', 'Systems'],
      ['6aff2aa5afe3492a69060b1b', 'Brand / Logo'],
      ['6aff2aa5afe3492a69060b1c', 'Automation'],
      ['6aff311cce2fa47ff5dd6352', 'Photography']
    ]);

    const firestoreCategories = await fetchCategories();
    const firestoreIdByName = new Map(
      firestoreCategories.map(cat => [cat.name.trim().toLowerCase(), cat.id])
    );

    for (const project of importedProjects) { //[cite: 7]
      const { id, _id, createdAt, ...data } = project; //[cite: 7]

      const matchedName =
        firestoreCategories.some(cat => cat.id === data.categoryId)
          ? ''
          : (oldCategoriesById.get(String(data.categoryId || '')) || data.category || '');

      const resolvedCategoryId = matchedName
        ? (firestoreIdByName.get(matchedName.trim().toLowerCase()) || '')
        : String(data.categoryId || '');

      await createProject({
        title: String(data.title || '').trim(),
        year: Number(data.year) || new Date().getFullYear(),
        categoryId: resolvedCategoryId,
        description: String(data.description || ''),
        tags: Array.isArray(data.tags) ? data.tags : [],
        link: String(data.link || ''),
        image: String(data.image || ''),
        featured: Boolean(data.featured)
      });
    }

    await render(); //[cite: 7]
    alert('Projects imported successfully!'); //[cite: 7]
  } catch (error) {
    console.error('Import error:', error); //[cite: 7]
    alert('Import failed: ' + error.message); //[cite: 7]
  } finally {
    importFile.value = ''; //[cite: 7]
  }
});


// ========================================
// 21. INITIALIZE APPLICATION
// ========================================

async function init() { //[cite: 7]
  try {
    await loadCategories(); //[cite: 7]
    await render(); //[cite: 7]
    console.log('Portfolio Manager connected to Firebase Firestore!');
  } catch (error) {
    console.error('Initialization error:', error); //[cite: 7]
    listEl.innerHTML =
      '<p class="empty">Unable to connect to Firestore. Check your Firebase config and rules.</p>';
    alert('Unable to connect to Firestore.');
  }
}

init(); //[cite: 7]