import { auth, signInWithEmailAndPassword, onAuthStateChanged } from './firebase-config.js';

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');
const loginBtn = document.getElementById('loginBtn');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');

// التحقق من حالة تسجيل الدخول مسبقاً
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = 'admin.html';
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;

    // تفعيل حالة التحميل
    loginBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'block';
    errorMessage.style.display = 'none';

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // التوجيه سيتم تلقائياً عبر المستمع onAuthStateChanged
    } catch (error) {
        console.error("Login error:", error);
        loginBtn.disabled = false;
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';

        errorMessage.style.display = 'block';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage.textContent = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage.textContent = 'محاولات كثيرة خاطئة. يرجى المحاولة لاحقاً';
        } else {
            errorMessage.textContent = 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة ثانية';
        }
    }
});
