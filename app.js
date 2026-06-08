document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const openLoginBtn = document.getElementById('open-login-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('toggle-password-btn');
    const passwordEyeIcon = document.getElementById('password-eye-icon');
    const errorAlert = document.getElementById('error-alert');
    const errorMessage = document.getElementById('error-message');
    const submitBtn = document.getElementById('submit-login-btn');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const toastContainer = document.getElementById('toast-container');

    const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1iSHsm7-yEJaXzjYnLz8LX71C2OCr4TCa4o1JsFW2qq0/gviz/tq?tqx=out:json';
    const REDIRECT_URL = 'https://hanae-marketing-planner-815054619043.asia-southeast1.run.app';

    // 1. Modal Toggle Handlers
    const openModal = () => {
        loginModal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        setTimeout(() => usernameInput.focus(), 300); // Focus username after animation
    };

    const closeModal = () => {
        loginModal.classList.remove('show');
        document.body.style.overflow = ''; // Restore background scrolling
        resetForm();
    };

    const resetForm = () => {
        loginForm.reset();
        errorAlert.classList.add('hidden');
        passwordInput.type = 'password';
        passwordEyeIcon.className = 'fa-solid fa-eye';
    };

    // Event Listeners for Modal
    openLoginBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);

    // Close modal when clicking outside of the modal container
    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            closeModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && loginModal.classList.contains('show')) {
            closeModal();
        }
    });

    // 2. Toggle Password Visibility
    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        passwordEyeIcon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-eye fa-solid';
    });

    // 3. Toast Notification helper
    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const iconClass = type === 'success' ? 'fa-circle-check success' : 'fa-circle-xmark error';
        
        toast.innerHTML = `
            <i class="fa-solid ${iconClass} toast-icon"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Trigger reflow for transition
        toast.offsetHeight;
        toast.classList.add('show');

        // Remove toast after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 400);
        }, 4000);
    };

    // 4. Form Submission & Validation Logic
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            showError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
            return;
        }

        // Set Loading State
        setLoading(true);
        errorAlert.classList.add('hidden');

        // Setup JSONP namespaces on window
        window.google = window.google || {};
        window.google.visualization = window.google.visualization || {};
        window.google.visualization.Query = window.google.visualization.Query || {};

        // Define timeout handle in case the network fails
        const timeoutDuration = 10000; // 10 seconds
        const timeoutId = setTimeout(() => {
            cleanup();
            showToast('การเชื่อมต่อหมดเวลา กรุณาตรวจสอบอินเทอร์เน็ตของคุณ', 'error');
            showError('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ชั่วคราว');
            setLoading(false);
        }, timeoutDuration);

        // Helper to remove script tag and global callback
        const cleanup = () => {
            clearTimeout(timeoutId);
            const existingScript = document.getElementById('gviz-jsonp-script');
            if (existingScript) {
                existingScript.remove();
            }
            if (window.google && window.google.visualization && window.google.visualization.Query) {
                delete window.google.visualization.Query.setResponse;
            }
        };

        // Define callback executed by Google Visualization API response
        window.google.visualization.Query.setResponse = (data) => {
            cleanup();

            try {
                if (!data || !data.table || !data.table.rows) {
                    throw new Error('Invalid sheet structure');
                }

                const rows = data.table.rows;
                let loginSuccess = false;

                // Look for matching credentials in rows
                for (const row of rows) {
                    if (!row.c || row.c.length < 2) continue;
                    
                    const cellUser = row.c[0];
                    const cellPass = row.c[1];

                    if (!cellUser || !cellPass) continue;

                    // Extract string values safely
                    const sheetUser = String(cellUser.f || cellUser.v).trim();
                    const sheetPass = String(cellPass.f || cellPass.v).trim();

                    // Compare exact credentials (username is case-insensitive, password is case-sensitive)
                    if (sheetUser.toLowerCase() === username.toLowerCase() && sheetPass === password) {
                        loginSuccess = true;
                        break;
                    }
                }

                if (loginSuccess) {
                    showToast('เข้าสู่ระบบสำเร็จ! กำลังนำทางไปยังแอปพลิเคชัน...', 'success');
                    
                    // Clear fields
                    usernameInput.value = '';
                    passwordInput.value = '';
                    
                    // Redirect after short delay so user sees success toast
                    setTimeout(() => {
                        window.location.href = REDIRECT_URL;
                    }, 1500);
                } else {
                    showError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
                    setLoading(false);
                }

            } catch (error) {
                console.error('Data processing error:', error);
                showToast('ข้อมูลในระบบไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ', 'error');
                showError('ไม่สามารถตรวจสอบข้อมูลได้ในขณะนี้');
                setLoading(false);
            }
        };

        // Create script tag for JSONP request to bypass browser CORS policy for local files
        const script = document.createElement('script');
        script.id = 'gviz-jsonp-script';
        script.src = `${GOOGLE_SHEET_URL}&t=${Date.now()}`;
        
        script.onerror = () => {
            cleanup();
            showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลภายนอก', 'error');
            showError('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ชั่วคราว');
            setLoading(false);
        };

        document.body.appendChild(script);
    });

    const showError = (msg) => {
        errorMessage.textContent = msg;
        errorAlert.classList.remove('hidden');
    };

    const setLoading = (isLoading) => {
        if (isLoading) {
            submitBtn.disabled = true;
            usernameInput.disabled = true;
            passwordInput.disabled = true;
            btnText.classList.add('hidden');
            btnSpinner.classList.remove('hidden');
        } else {
            submitBtn.disabled = false;
            usernameInput.disabled = false;
            passwordInput.disabled = false;
            btnText.classList.remove('hidden');
            btnSpinner.classList.add('hidden');
        }
    };
});
