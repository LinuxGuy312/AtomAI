const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendIcon = document.getElementById('send-icon');
const themeToggle = document.getElementById('theme-toggle');
const moonIcon = document.getElementById('moon-icon');
const sunIcon = document.getElementById('sun-icon');
const aiName = document.getElementById('ai-name');
const dropdownContent = document.querySelector('.dropdown-content');
const aiLogo = document.getElementById('ai-logo');
const currentModel = document.getElementById('current-model');
const scrollToBottomBtn = document.getElementById('scroll-to-bottom');
const welcomeScreen = document.getElementById('welcome-screen');
const startChatBtn = document.getElementById('start-chat-btn');
const body = document.body;

let selectedModel = localStorage.getItem('selectedModel') || 'gpt-4o-mini'; // Default model or last used model
let isWaitingForResponse = false; // Track if waiting for AI response
let scrollTimeout;
let modelNames = {
  'gpt-4o-mini': 'GPT-4o mini',
  'claude-3-haiku-20240307': 'Claude 3 Haiku',
  'mistralai/Mixtral-8x7B-Instruct-v0.1': 'Mistral AI',
  'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo': 'Meta Llama'
}
let currentAnimation = null;
let currentAIMessage = null;

// Function to add the 'scrolling' class when scrolling
function handleScroll() {
  chatBox.classList.add('scrolling');

  // Clear the timeout if it exists
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }

  // Set a timeout to remove the 'scrolling' class after 1 second of inactivity
  scrollTimeout = setTimeout(() => {
    chatBox.classList.remove('scrolling');
  }, 1500); // 1.5 second delay
}

// Add scroll event listener to the chat box
chatBox.addEventListener('scroll', handleScroll);

// Add scroll to bottom button
chatBox.addEventListener('scroll', () => {
  const isNearBottom = chatBox.scrollHeight - chatBox.clientHeight <= chatBox.scrollTop + 50;
  scrollToBottomBtn.style.display = isNearBottom ? 'none' : 'block';
});

scrollToBottomBtn.addEventListener('click', () => {
  chatBox.scrollTo({
    top: chatBox.scrollHeight,
    behavior: 'smooth',
  });
});

// Function to add a user message to the chat
function addUserMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', 'user');
  messageElement.innerHTML = `<div class="message-content">${message}</div>`;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight; // Scroll to bottom
}

// Function to render markdown and highlight code blocks
function renderMarkdown(content) {
  const rendered = marked.parse(content);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = rendered;
  tempDiv.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightBlock(block);
  });
  return tempDiv.innerHTML;
}

// Function to send user input to the backend
async function sendMessage() {
  const userMessage = userInput.value.trim();
  if (!userMessage || isWaitingForResponse) return;

  // Reset previous animation
  if (currentAnimation) {
    clearTimeout(currentAnimation);
    currentAIMessage?.remove();
  }

  addUserMessage(userMessage);
  userInput.value = '';
  isWaitingForResponse = true;
  sendIcon.style.display = 'none';

  // Create AI message with persistent typing indicator
  const aiMessage = document.createElement('div');
  aiMessage.classList.add('message', 'ai');
  aiMessage.innerHTML = `
    <div class="message-content">
      <div class="typing-indicator">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>
  `;
  chatBox.appendChild(aiMessage);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const response = await fetch(`https://duck.gpt-api.workers.dev/chat/?prompt=${encodeURIComponent(userMessage)}&model=${selectedModel}`);
    const data = await response.json();

    const messageContent = aiMessage.querySelector('.message-content');
    const typingIndicator = messageContent.querySelector('.typing-indicator');

    // Get layout metrics first
    const style = getComputedStyle(messageContent);
    const lineHeight = parseFloat(style.lineHeight);
    const paddingVert = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);

    // Fade out typing indicator
    typingIndicator.style.opacity = '0';
    
    // Lock initial height
    const initialHeight = messageContent.offsetHeight;
    messageContent.style.height = `${initialHeight}px`;

    // Process response
    const rawText = data.response;
    let buffer = '';
    let index = 0;
    let isInTag = false;
    // let targetHeight = initialHeight - 18*1.4;

    setTimeout(() => {
      typingIndicator.remove();
      messageContent.style.padding = '0 18px 24px';

      // Store reference to current message and animation
      currentAIMessage = aiMessage;

      function typeCharacter() {
        if (index >= rawText.length) {
          isWaitingForResponse = false;
          currentAnimation = null;
          currentAIMessage = null;
          return;
        }

        const char = rawText[index];
        buffer += char;
        
        // Tag detection
        if (char === '<') isInTag = true;
        if (char === '>') isInTag = false;

        // Update display only when safe
        if (!isInTag || char === '>') {
          messageContent.innerHTML = renderMarkdown(buffer);
          
          // Calculate height in line-height increments
          const contentHeight = messageContent.scrollHeight - 18*1.4;
          const lineCount = parseFloat((contentHeight - paddingVert) / lineHeight);
          const targetHeight = lineCount * lineHeight + paddingVert;
          
          messageContent.style.height = `${targetHeight}px`;

          // Smart scrolling
          if (chatBox.scrollHeight - chatBox.clientHeight <= chatBox.scrollTop + 100) {
            chatBox.scrollTop = chatBox.scrollHeight;
          }
        }

        index++;
        currentAnimation = setTimeout(typeCharacter, isInTag ? 0 : 20);
      }

      // Start animation
      typeCharacter();
    }, 300);

  } catch (error) {
    console.error('Error:', error);
    aiMessage.querySelector('.message-content').innerHTML = 
      "Sorry, I couldn't get a response.";
    isWaitingForResponse = false;
  }
}

// Function to clear chat
const clearChatBtn = document.getElementById('clear-chat-btn');

function clearChat() {
  chatBox.innerHTML = ''; // Remove all chat messages
}

clearChatBtn.addEventListener('click', clearChat);

// Function to toggle dark/light mode
function toggleTheme() {
  body.classList.toggle('light-mode');
  const isLightMode = body.classList.contains('light-mode');
  moonIcon.style.display = isLightMode ? 'none' : 'block';
  sunIcon.style.display = isLightMode ? 'block' : 'none';
  localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
}

// Load saved theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
  body.classList.add('light-mode');
  moonIcon.style.display = 'none';
  sunIcon.style.display = 'block';
} else {
  moonIcon.style.display = 'block';
  sunIcon.style.display = 'none';
}

// Load saved model preference
function loadSelectedModel() {
  selectedModel = localStorage.getItem('selectedModel') || 'gpt-4o-mini'; // Default to GPT-4o mini if no model is saved
  currentModel.textContent = modelNames[selectedModel]; // Update the displayed model name
}

// Save selected model to localStorage
function saveSelectedModel(model) {
  localStorage.setItem('selectedModel', model);
}

// Toggle dropdown when Model name is clicked
currentModel.addEventListener('click', () => {
  dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
});

// Toggle dropdown when AI name is clicked
aiName.addEventListener('click', () => {
  dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
});

// Handle model selection
dropdownContent.addEventListener('click', (e) => {
  if (e.target.tagName === 'DIV') {
    // Cancel ongoing animation
    if (currentAnimation) {
      clearTimeout(currentAnimation);
      currentAnimation = null;
    }
    
    // Remove any partial AI message
    if (currentAIMessage) {
      currentAIMessage.remove();
      currentAIMessage = null;
    }
    
    // Reset states
    isWaitingForResponse = false;

    // Close the dropdown immediately after selection
    dropdownContent.style.display = 'none';
    
    // Update model
    selectedModel = e.target.dataset.model;
    currentModel.textContent = e.target.textContent;
    saveSelectedModel(selectedModel);
    chatBox.innerHTML = '';
    
    // Enable input immediately
    userInput.disabled = false;
    sendIcon.style.display = 'none';
  }
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!aiName.contains(e.target) && (!currentModel.contains(e.target)) && !dropdownContent.contains(e.target)) {
    dropdownContent.style.display = 'none';
  }
});

// Show/hide send icon based on input
userInput.addEventListener('input', () => {
  if (userInput.value.trim()) {
    sendIcon.style.display = 'block'; // Show send icon
  } else {
    sendIcon.style.display = 'none'; // Hide send icon
  }
});

// Send message when the send icon is clicked
sendIcon.addEventListener('click', sendMessage);

// Send message when Enter is pressed
userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

themeToggle.addEventListener('click', toggleTheme);

// Load the selected model on page load
loadSelectedModel();

// Function to enter fullscreen mode
function enterFullscreen() {
  const elem = document.documentElement; // Target the entire page
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.mozRequestFullScreen) { // Firefox
    elem.mozRequestFullScreen();
  } else if (elem.webkitRequestFullscreen) { // Chrome, Safari, and Opera
    elem.webkitRequestFullscreen();
  } else if (elem.msRequestFullscreen) { // IE/Edge
    elem.msRequestFullscreen();
  }
}

// Hide welcome screen and show chat interface
startChatBtn.addEventListener('click', () => {
  welcomeScreen.style.opacity = '0'; // Fade out the welcome screen
  setTimeout(() => {
    welcomeScreen.style.display = 'none'; // Hide the welcome screen
    userInput.focus();
  }, 500); // Match the duration of the opacity transition
  enterFullscreen();
});