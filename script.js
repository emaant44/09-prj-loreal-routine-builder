/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */

// Store selected products in an array
let selectedProducts = [];

function displayProducts(products) {
  // Only show products that are not selected
  const unselectedProducts = products.filter(
    (product) => !selectedProducts.some((p) => p.id === product.id)
  );
  productsContainer.innerHTML = unselectedProducts
    .map(
      (product) => `
    <div class="product-card" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button class="desc-btn" data-id="${product.id}">Description</button>
        <button class="add-btn" data-id="${product.id}">Add</button>
      </div>
    </div>
  `
    )
    .join("");

  // Add event listeners to all description buttons
  const descButtons = document.querySelectorAll(".desc-btn");
  descButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const productId = parseInt(btn.getAttribute("data-id"));
      const products = await loadProducts();
      const product = products.find((p) => p.id === productId);
      if (product) {
        showModal(product.name, product.description);
      }
    });
  });

  // Add event listeners to all add buttons
  const addButtons = document.querySelectorAll(".add-btn");
  addButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const productId = parseInt(btn.getAttribute("data-id"));
      // Find the product in the current products array
      const product = products.find((p) => p.id === productId);
      if (product && !selectedProducts.some((p) => p.id === productId)) {
        selectedProducts.push(product);
        updateSelectedProducts();
        // Remove the product card from the current view only
        btn.closest(".product-card").remove();
      }
    });
  });
}

// Make selected products area a drop target
const selectedProductsList = document.getElementById("selectedProductsList");
if (selectedProductsList) {
  selectedProductsList.addEventListener("dragover", (e) => {
    e.preventDefault();
    selectedProductsList.classList.add("drag-over");
  });
  selectedProductsList.addEventListener("dragleave", (e) => {
    selectedProductsList.classList.remove("drag-over");
  });
  selectedProductsList.addEventListener("drop", async (e) => {
    e.preventDefault();
    selectedProductsList.classList.remove("drag-over");
    const productId = parseInt(e.dataTransfer.getData("text/plain"));
    const products = await loadProducts();
    const product = products.find((p) => p.id === productId);
    if (product && !selectedProducts.some((p) => p.id === productId)) {
      selectedProducts.push(product);
      updateSelectedProducts();
      displayProducts(products);
    }
  });
}

function updateSelectedProducts() {
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="product-card selected" data-id="${product.id}">
        <img src="${product.image}" alt="${product.name}">
        <div class="product-info">
          <h3>${product.name}</h3>
          <p>${product.brand}</p>
          <button class="desc-btn" data-id="${product.id}">Description</button>
          <button class="remove-btn" data-id="${product.id}">Remove</button>
        </div>
      </div>
    `
    )
    .join("");

  // Add event listeners to all description buttons in selected products
  const descButtons = selectedProductsList.querySelectorAll(".desc-btn");
  descButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const productId = parseInt(btn.getAttribute("data-id"));
      const products = await loadProducts();
      const product = products.find((p) => p.id === productId);
      if (product) {
        showModal(product.name, product.description);
      }
    });
  });

  // Add event listeners to all remove buttons
  const removeButtons = selectedProductsList.querySelectorAll(".remove-btn");
  removeButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const productId = parseInt(btn.getAttribute("data-id"));
      // Remove from selectedProducts
      selectedProducts = selectedProducts.filter((p) => p.id !== productId);
      updateSelectedProducts();
      // Redisplay current category so product reappears
      const products = await loadProducts();
      const selectedCategory = categoryFilter.value;
      if (selectedCategory) {
        const filteredProducts = products.filter(
          (product) => product.category === selectedCategory
        );
        displayProducts(filteredProducts);
      }
    });
  });
  // ...existing code...
}

// Show selected products on page load
window.addEventListener("DOMContentLoaded", async () => {
  updateSelectedProducts();
});

/* Show modal with product description */
function showModal(title, description) {
  // Create modal HTML
  const modal = document.createElement("div");
  modal.className = "modal-bg";
  modal.innerHTML = `
    <div class="modal">
      <h2>${title}</h2>
      <p>${description}</p>
      <button class="close-modal">Close</button>
    </div>
  `;
  document.body.appendChild(modal);

  // Close modal on button click or background click
  modal.querySelector(".close-modal").onclick = () =>
    document.body.removeChild(modal);
  modal.onclick = (e) => {
    if (e.target === modal) document.body.removeChild(modal);
  };
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Chat form submission handler - placeholder for OpenAI integration */
// Handle chat form submit, send user's message to Cloudflare Worker, and display AI response
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get user message and clear input
  const userInputElem = document.getElementById("userInput");
  const userMsg = userInputElem.value.trim();
  if (!userMsg) return;
  userInputElem.value = "";

  // Add user's message to chat window (optional, improves user feedback)
  chatWindow.innerHTML += `<div class="chat-msg user">${userMsg}</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Show typing animation for bot
  const typingBubble = document.createElement("div");
  typingBubble.className = "chat-msg bot typing";
  typingBubble.innerHTML = `<span></span><span></span><span></span>`;
  chatWindow.appendChild(typingBubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Build conversation as an array of messages (role/content format expected by OpenAI)
  // Add a system prompt to encourage a friendly, conversational tone
  const messages = [
    {
      role: "system",
      content:
        "You are a friendly skincare and beauty assistant for L'Oréal. Always reply in a natural, conversational way. Use line breaks or bullet points to make your answers easy to read.",
    },
    { role: "user", content: userMsg },
  ];

  // POST to your Cloudflare Worker endpoint
  try {
    const response = await fetch(
      "https://routineloreal.emaantovska2005.workers.dev/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      }
    );

    const data = await response.json();
    // For your Worker, the AI's reply is likely at: data.choices[0].message.content
    const botReply =
      data.choices?.[0]?.message?.content?.replace(/\n/g, "<br>") ||
      data.reply?.content?.replace(/\n/g, "<br>") ||
      "Sorry, AI could not be reached.";

    // Remove typing animation and show bot reply as a chat bubble
    typingBubble.remove();
    chatWindow.innerHTML += `<div class="chat-msg bot">${botReply}</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (err) {
    typingBubble.remove();
    chatWindow.innerHTML += `<div class="chat-msg error">Error: ${err.message}</div>`;
  }
});
