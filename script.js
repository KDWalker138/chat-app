// CHANGE THESE
const SUPABASE_URL = "https://kcnigiqauxkzutnscsyh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbmlnaXFhdXhrenV0bnNjc3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MjYyNTYsImV4cCI6MjA4NzUwMjI1Nn0.DwOwkIPWqyeLKDzn8sFGHtsyf9jObxTEJMcZmUh12Qs";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM
const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-screen");
const emailInput = document.getElementById("email-input");
const loginBtn = document.getElementById("login-btn");
const messagesDiv = document.getElementById("messages");
const msgInput = document.getElementById("msg-input");
const sendBtn = document.getElementById("send-btn");
const fileBtn = document.getElementById("file-btn");
const fileInput = document.getElementById("file-input");
const darkToggle = document.getElementById("dark-toggle");
const messagesContainer = document.getElementById("messages-container");

// LOGIN
loginBtn.onclick = async () => {
  const email = emailInput.value.trim();
  if (!email) return alert("Enter email");

  const { data: allowed } = await supabase
    .from("allowed_users")
    .select("email")
    .eq("email", email);

  if (!allowed || allowed.length === 0) {
    alert("Access Denied.");
    return;
  }

  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) alert("Login failed");
  else alert("Check your email for login link!");
};

// SHOW CHAT AFTER LOGIN
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session) {
    loginScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");
    loadMessages();
  }
});

// LOAD MESSAGES
async function loadMessages() {
  const { data } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });

  messagesDiv.innerHTML = "";
  const user = (await supabase.auth.getUser()).data.user;

  data.forEach(msg => {
    const bubble = document.createElement("div");
    bubble.classList.add("msg");
    bubble.classList.add(msg.sender === user.email ? "me" : "other");

    // MEDIA
    if (msg.media_url) {
      const img = document.createElement("img");
      img.src = getPublicMediaURL(msg.media_url);
      img.onclick = () => window.open(img.src, "_blank");
      bubble.appendChild(img);
    }

    if (msg.content) {
      const textNode = document.createElement("span");
      textNode.textContent = msg.content;
      bubble.appendChild(textNode);
    }

    const ts = document.createElement("span");
    ts.classList.add("timestamp");
    ts.textContent = new Date(msg.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    bubble.appendChild(ts);

    messagesDiv.appendChild(bubble);
  });

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// SEND TEXT
sendBtn.onclick = async () => {
  const txt = msgInput.value.trim();
  if (!txt) return;
  const user = (await supabase.auth.getUser()).data.user;
  await supabase.from("messages").insert({ sender: user.email, content: txt });
  msgInput.value = "";
};

// SEND MEDIA
fileBtn.onclick = () => fileInput.click();
fileInput.onchange = async () => {
  const file = fileInput.files[0];
  if (!file) return;
  const user = (await supabase.auth.getUser()).data.user;
  const filePath = `${user.email}/${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage.from("media").upload(filePath, file);
  if (!error) await supabase.from("messages").insert({ sender: user.email, media_url: data.path });
  fileInput.value = "";
};

// MEDIA URL
function getPublicMediaURL(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/media/${path}`;
}

// REALTIME
supabase.channel("realtime:messages")
  .on("postgres_changes", { event:"*", schema:"public", table:"messages" }, () => loadMessages())
  .subscribe();

// DARK MODE
darkToggle.onclick = () => document.body.classList.toggle("dark");
