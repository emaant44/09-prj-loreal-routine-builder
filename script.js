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

// Load selected products from localStorage if available
function loadSelectedProducts() {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    try {
      selectedProducts = JSON.parse(saved);
    } catch (e) {
      selectedProducts = [];
    }
  }
}

// Save selected products to localStorage
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

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
        saveSelectedProducts();
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
      saveSelectedProducts();
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
  // Handle Generate Routine button click
  const generateRoutineBtn = document.getElementById("generateRoutine");
  if (generateRoutineBtn) {
    generateRoutineBtn.addEventListener("click", async () => {
      if (selectedProducts.length === 0) {
        chatWindow.innerHTML += `<div class="chat-msg error">Please select at least one product to generate a routine.</div>`;
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return;
      }
      // Build a message describing the selected products
      const productList = selectedProducts
        .map((p, i) => `${i + 1}. ${p.name} (${p.brand})`)
        .join("\n");
      const userMsg = `Here are the products I've selected:\n${productList}\nCan you create a personalized skincare routine using these products?`;
      // Add user's message to chat window
      chatWindow.innerHTML += `<div class="chat-msg user">${userMsg.replace(
        /\n/g,
        "<br>"
      )}</div>`;
      chatWindow.scrollTop = chatWindow.scrollHeight;
      // Show typing animation for bot
      const typingBubble = document.createElement("div");
      typingBubble.className = "chat-msg bot typing";
      typingBubble.innerHTML = `<span></span><span></span><span></span>`;
      chatWindow.appendChild(typingBubble);
      chatWindow.scrollTop = chatWindow.scrollHeight;
      // Build messages array with system prompt
      const messages = [
        {
          role: "system",
          content:
            "You are a friendly skincare and beauty assistant for L'Oréal. Always reply in a natural, conversational way. Use line breaks or bullet points to make your answers easy to read.",
        },
        { role: "user", content: userMsg },
      ];
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
        const botReply =
          data.choices?.[0]?.message?.content?.replace(/\n/g, "<br>") ||
          data.reply?.content?.replace(/\n/g, "<br>") ||
          "Sorry, AI could not be reached.";
        typingBubble.remove();
        chatWindow.innerHTML += `<div class="chat-msg bot">${botReply}</div>`;
        chatWindow.scrollTop = chatWindow.scrollHeight;
      } catch (err) {
        typingBubble.remove();
        chatWindow.innerHTML += `<div class="chat-msg error">Error: ${err.message}</div>`;
      }
    });
  }
  // ...existing code...
}

// Show selected products on page load
window.addEventListener("DOMContentLoaded", async () => {
  loadSelectedProducts();
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
  const searchValue = document
    .getElementById("productSearch")
    .value.trim()
    .toLowerCase();
  let filteredProducts = products;
  if (selectedCategory) {
    filteredProducts = filteredProducts.filter(
      (product) => product.category === selectedCategory
    );
  }
  if (searchValue) {
    filteredProducts = filteredProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(searchValue) ||
        product.description?.toLowerCase().includes(searchValue) ||
        product.brand?.toLowerCase().includes(searchValue)
    );
  }
  displayProducts(filteredProducts);
});

// Product search field handler
const productSearch = document.getElementById("productSearch");
if (productSearch) {
  productSearch.addEventListener("input", async (e) => {
    const products = await loadProducts();
    const searchValue = productSearch.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;
    let filteredProducts = products;
    if (selectedCategory) {
      filteredProducts = filteredProducts.filter(
        (product) => product.category === selectedCategory
      );
    }
    if (searchValue) {
      filteredProducts = filteredProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(searchValue) ||
          product.description?.toLowerCase().includes(searchValue) ||
          product.brand?.toLowerCase().includes(searchValue)
      );
    }
    displayProducts(filteredProducts);
  });
}

/* Chat form submission handler - placeholder for OpenAI integration */
// Store chat history for context
let chatHistory = [];

// Load product data for context
let allProducts = [];
loadProducts().then((products) => {
  allProducts = products;
});

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userInputElem = document.getElementById("userInput");
  const userMsg = userInputElem.value.trim();
  if (!userMsg) return;
  userInputElem.value = "";

  // Add user's message to chat window
  chatWindow.innerHTML += `<div class="chat-msg user">${userMsg}</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Add user message to chat history
  chatHistory.push({ role: "user", content: userMsg });

  // Show typing animation for bot
  const typingBubble = document.createElement("div");
  typingBubble.className = "chat-msg bot typing";
  typingBubble.innerHTML = `<span></span><span></span><span></span>`;
  chatWindow.appendChild(typingBubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Build system prompt with selected products and product info
  let selectedList = selectedProducts
    .map((p, i) => `${i + 1}. ${p.name} (${p.brand})`)
    .join("\n");
  let productDetails = allProducts
    .map((p) => `- ${p.name} (${p.brand}): ${p.description}`)
    .join("\n");
  const systemPrompt =
    "You are a friendly skincare and beauty assistant for L'Oréal. Always reply in a natural, conversational way. Use line breaks or bullet points to make your answers easy to read.\n" +
    "Here are the products the user has selected:\n" +
    (selectedList ? selectedList + "\n" : "(none)\n") +
    "Here is information about all available products:\n" +
    productDetails;

  // Build messages array: system prompt + chat history
  const messages = [{ role: "system", content: systemPrompt }, ...chatHistory];

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
    const botReply =
      data.choices?.[0]?.message?.content?.replace(/\n/g, "<br>") ||
      data.reply?.content?.replace(/\n/g, "<br>") ||
      "Sorry, AI could not be reached.";
    // Add bot reply to chat history
    chatHistory.push({ role: "assistant", content: botReply });
    typingBubble.remove();
    chatWindow.innerHTML += `<div class="chat-msg bot">${botReply}</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (err) {
    typingBubble.remove();
    chatWindow.innerHTML += `<div class="chat-msg error">Error: ${err.message}</div>`;
  }
});
