const bar = document.getElementById('bar');
const close = document.getElementById('close');
const nav = document.getElementById('navbar');

if (bar){
    bar.addEventListener('click', ()=>{
        nav.classList.add('active');
    })
}

if (close){
    close.addEventListener('click', ()=>{
        nav.classList.remove('active');
    })
}



/*Signin Form*/

const signinForm = document.getElementById("signin-form");
const registerForm = document.getElementById("register-form");
const formTitle = document.getElementById("form-title");
const toggleText = document.querySelector(".toggle-text");

function switchForms() {
  if (signinForm.classList.contains("active")) {
    signinForm.classList.remove("active");
    registerForm.classList.add("active");
    formTitle.textContent = "Register";
    toggleText.innerHTML = 'Already have an account? <span id="toggle">Sign In</span>';
  } else {
    registerForm.classList.remove("active");
    signinForm.classList.add("active");
    formTitle.textContent = "Sign In";
    toggleText.innerHTML = 'Don’t have an account? <span id="toggle">Register</span>';
  }
  // re-bind toggle span since innerHTML is replaced
  document.getElementById("toggle").addEventListener("click", switchForms);
}

document.getElementById("toggle").addEventListener("click", switchForms);

