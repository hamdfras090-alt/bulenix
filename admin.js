// استيراد Firebase
import { db, collection, addDoc, getDocs, deleteDoc, doc, onSnapshot, updateDoc, auth, onAuthStateChanged, signOut } from './firebase-config.js';

// التحقق من حالة تسجيل الدخول فوراً قبل تحميل أي شيء
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addProductForm');
    const adminProductList = document.getElementById('adminProductList');
    const dropZone = document.getElementById('dropZone');
    const pFileInput = document.getElementById('pFileInput');
    const imagePreview = document.getElementById('imagePreview');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const removeImgBtn = document.getElementById('removeImg');
    const pCountDisp = document.getElementById('pCount');
    const logoutBtn = document.getElementById('logoutBtn');

    let currentImageData = ""; // Base64 storage
    let currentSliderImageData = "";
    let productsCache = {}; // لتخزين IDs من Firestore


    // Tab Switching
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const tab = item.getAttribute('data-tab');
            if (!tab) return;
            e.preventDefault();

            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
            document.getElementById(`${tab}Section`).style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // Logout Functionality
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
                try {
                    await signOut(auth);
                    window.location.href = 'login.html';
                } catch (error) {
                    console.error('Error signing out:', error);
                    alert('حدث خطأ أثناء تسجيل الخروج');
                }
            }
        });
    }

    // Image Upload Logic
    dropZone.addEventListener('click', () => pFileInput.click());

    pFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 700; // Optimized for performance and consistency
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    currentImageData = canvas.toDataURL('image/jpeg', 0.75); // Optimized quality for web
                    imagePreview.src = currentImageData;
                    imagePreview.hidden = false;
                    uploadPlaceholder.hidden = true;
                    removeImgBtn.hidden = false;
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });


    removeImgBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentImageData = "";
        imagePreview.src = "";
        imagePreview.hidden = true;
        uploadPlaceholder.hidden = false;
        removeImgBtn.hidden = true;
        pFileInput.value = "";
    });

    // Load Products من Firestore
    function loadAdminProducts() {
        const productsRef = collection(db, 'products');
        onSnapshot(productsRef, (snapshot) => {
            const products = [];
            productsCache = {};

            snapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data();
                const productData = { firestoreId: docSnapshot.id, ...data };
                products.push(productData);
                productsCache[docSnapshot.id] = productData;
            });

            pCountDisp.textContent = products.length;

            if (products.length === 0) {
                adminProductList.innerHTML = '<p style="grid-column: span 12; text-align: center; color: #7f8c8d; padding: 40px;">لا يوجد منتجات في المخزون حالياً.</p>';
                return;
            }

            adminProductList.innerHTML = products.map((p) => `
                <div class="admin-p-card">
                    <img src="${p.img}" alt="${p.title}" class="admin-p-img">
                    <div class="admin-p-info">
                        <h3>${p.title}</h3>
                        <p><strong>${p.price} د.ل</strong> • ${p.category}</p>
                        <button class="delete-btn" onclick="deleteProduct('${p.firestoreId}')">
                            <i data-lucide="trash-2"></i> حذف المنتج
                        </button>
                    </div>
                </div>
            `).join('');

            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    }

    // Handle form submission - حفظ في Firestore
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentImageData) {
            alert('يرجى اختيار صورة للمنتج أولاً.');
            return;
        }

        const newProduct = {
            title: document.getElementById('pName').value,
            price: document.getElementById('pPrice').value,
            category: document.getElementById('pCategory').value,
            img: currentImageData,
            desc: document.getElementById('pDesc').value,
            status: document.getElementById('pStatus').value,
            id: Date.now(),
            createdAt: new Date().toISOString()
        };

        try {
            await addDoc(collection(db, 'products'), newProduct);

            // Reset
            form.reset();
            removeImgBtn.click();
            alert('تم نشر المنتج بنجاح! سيظهر الآن في واجهة المتجر الرئيسية.');
        } catch (error) {
            console.error('خطأ في إضافة المنتج:', error);
            alert('حدث خطأ في إضافة المنتج. يرجى المحاولة مرة أخرى.');
        }
    });

    window.deleteProduct = async (firestoreId) => {
        if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
            try {
                await deleteDoc(doc(db, 'products', firestoreId));
                console.log('تم حذف المنتج بنجاح');
            } catch (error) {
                console.error('خطأ في حذف المنتج:', error);
                alert('حدث خطأ في حذف المنتج');
            }
        }
    };

    // --- Slider Image Management ---
    const sliderDropZone = document.getElementById('sliderDropZone');
    const sliderFileInput = document.getElementById('sliderFileInput');
    const sliderImagePreview = document.getElementById('sliderImagePreview');
    const sliderUploadPlaceholder = document.getElementById('sliderUploadPlaceholder');
    const removeSliderImgBtn = document.getElementById('removeSliderImg');
    const sliderForm = document.getElementById('addSliderForm');
    const adminSliderList = document.getElementById('adminSliderList');

    if (sliderDropZone) {
        sliderDropZone.addEventListener('click', () => sliderFileInput.click());

        sliderFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 1920; // Full HD resolution for crystal clear sliders
                        let width = img.width;
                        let height = img.height;

                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        currentSliderImageData = canvas.toDataURL('image/jpeg', 0.9); // High quality for professional look

                        sliderImagePreview.src = currentSliderImageData;
                        sliderImagePreview.hidden = false;
                        sliderUploadPlaceholder.hidden = true;
                        removeSliderImgBtn.hidden = false;
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });


        removeSliderImgBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentSliderImageData = "";
            sliderImagePreview.src = "";
            sliderImagePreview.hidden = true;
            sliderUploadPlaceholder.hidden = false;
            removeSliderImgBtn.hidden = true;
            sliderFileInput.value = "";
        });

        sliderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentSliderImageData) {
                alert('يرجى اختيار صورة للسلايدر أولاً.');
                return;
            }

            try {
                await addDoc(collection(db, 'sliderImages'), {
                    img: currentSliderImageData,
                    id: Date.now(),
                    createdAt: new Date().toISOString()
                });

                sliderForm.reset();
                removeSliderImgBtn.click();
                alert('تمت إضافة صورة السلايدر بنجاح!');
            } catch (error) {
                console.error('خطأ في إضافة صورة السلايدر:', error);
                alert('حدث خطأ في إضافة الصورة');
            }
        });
    }

    function loadSliderImages() {
        if (!adminSliderList) return;

        const sliderRef = collection(db, 'sliderImages');
        onSnapshot(sliderRef, (snapshot) => {
            const sliderImages = [];

            snapshot.forEach((docSnapshot) => {
                sliderImages.push({ firestoreId: docSnapshot.id, ...docSnapshot.data() });
            });

            if (sliderImages.length === 0) {
                adminSliderList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #7f8c8d; padding: 20px;">لا توجد صور للسلايدر حالياً.</p>';
                return;
            }

            adminSliderList.innerHTML = sliderImages.map((img, index) => `
                <div class="admin-p-card">
                    <img src="${img.img}" alt="Slider ${index}" class="admin-p-img">
                    <div class="admin-p-info">
                        <button class="delete-btn" onclick="deleteSliderImage('${img.firestoreId}')">
                            <i data-lucide="trash-2"></i> حذف الصورة
                        </button>
                    </div>
                </div>
            `).join('');
            lucide.createIcons();
        });
    }

    window.deleteSliderImage = async (firestoreId) => {
        if (confirm('هل أنت متأكد من حذف هذه الصورة من السلايدر؟')) {
            try {
                await deleteDoc(doc(db, 'sliderImages', firestoreId));
                console.log('تم حذف الصورة بنجاح');
            } catch (error) {
                console.error('خطأ في حذف الصورة:', error);
                alert('حدث خطأ في حذف الصورة');
            }
        }
    };


    // Load and Display Orders من Firestore
    function loadOrders() {
        const ordersRef = collection(db, 'orders');
        onSnapshot(ordersRef, (snapshot) => {
            const orders = [];
            snapshot.forEach((docSnapshot) => {
                orders.push({ firestoreId: docSnapshot.id, ...docSnapshot.data() });
            });

            const ordersList = document.getElementById('ordersList');
            const ordersBadge = document.getElementById('ordersBadge');

            // Update badge
            if (orders.length > 0) {
                ordersBadge.textContent = orders.length;
                ordersBadge.style.display = 'inline-block';
            } else {
                ordersBadge.style.display = 'none';
            }

            if (!ordersList) return;

            if (orders.length === 0) {
                ordersList.innerHTML = `
                    <div style="text-align: center; padding: 80px 20px; color: #7f8c8d;">
                        <i data-lucide="inbox" style="width:80px; height:80px; margin-bottom:20px; color:#ddd;"></i>
                        <h3 style="color: #5a6a7a; margin-bottom: 10px;">لا توجد طلبات حتى الآن</h3>
                        <p>ستظهر الطلبات الواردة من الزبائن هنا</p>
                    </div>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }

            // Sort orders by date (newest first)
            orders.sort((a, b) => b.timestamp - a.timestamp);

            // لن نحتاج allProducts لأن order يحتوي على المعلومات

            ordersList.innerHTML = orders.map((order) => `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-id-section">
                        <i data-lucide="receipt"></i>
                        <div>
                            <h3>طلب رقم #${order.id}</h3>
                            <span class="order-date">${formatDate(order.timestamp)}</span>
                        </div>
                    </div>
                    <div class="order-status ${order.status || 'pending'}">
                        ${getStatusText(order.status || 'pending')}
                    </div>
                </div>

                <div class="order-customer-info">
                    <div class="customer-detail">
                        <i data-lucide="user"></i>
                        <div>
                            <span class="label">الاسم:</span>
                            <span class="value">${order.customerName}</span>
                        </div>
                    </div>
                    <div class="customer-detail">
                        <i data-lucide="phone"></i>
                        <div>
                            <span class="label">الهاتف:</span>
                            <span class="value">${order.customerPhone}</span>
                        </div>
                    </div>
                    <div class="customer-detail">
                        <i data-lucide="building"></i>
                        <div>
                            <span class="label">المدينة:</span>
                            <span class="value">${order.customerCity || 'غير محدد'}</span>
                        </div>
                    </div>
                    <div class="customer-detail">
                        <i data-lucide="map"></i>
                        <div>
                            <span class="label">المنطقة:</span>
                            <span class="value">${order.customerArea || 'غير محدد'}</span>
                        </div>
                    </div>
                    <div class="customer-detail full-width">
                        <i data-lucide="map-pin"></i>
                        <div>
                            <span class="label">العنوان التفصيلي:</span>
                            <span class="value">${order.customerAddress}</span>
                        </div>
                    </div>
                </div>

                <div class="order-items">
                    <h4><i data-lucide="package"></i> المنتجات المطلوبة:</h4>
                    <div class="order-products-list">
                        ${order.items.map(item => `
                            <div class="order-product-item">
                                <div class="order-product-info">
                                    <span class="product-name">${item.title}</span>
                                    <span class="product-price">${parseFloat(item.price).toFixed(2)} د.ل</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="order-footer">
                    <div class="order-total">
                        <span>الإجمالي:</span>
                        <span class="total-amount">${order.total} د.ل</span>
                    </div>
                    <div class="order-actions">
                        <select class="status-select" onchange="updateOrderStatus('${order.firestoreId}', this.value)">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>⏳ قيد المراجعة</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>🔄 قيد التجهيز</option>
                            <option value="shipping" ${order.status === 'shipping' ? 'selected' : ''}>🚚 قيد التوصيل</option>
                            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>✅ تم التوصيل</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>❌ ملغي</option>
                        </select>
                        <button class="action-btn delete-btn" onclick="deleteOrder('${order.firestoreId}')">
                            <i data-lucide="trash-2"></i>
                            حذف
                        </button>
                    </div>
                </div>
            </div>
            `).join('');

            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    }

    function formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('ar-LY', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getStatusText(status) {
        const statusMap = {
            'pending': '⏳ قيد المراجعة',
            'processing': '🔄 قيد التجهيز',
            'shipping': '🚚 قيد التوصيل',
            'completed': '✅ تم التوصيل',
            'cancelled': '❌ ملغي'
        };
        return statusMap[status] || statusMap['pending'];
    }

    window.updateOrderStatus = async (firestoreId, status) => {
        try {
            await updateDoc(doc(db, 'orders', firestoreId), {
                status: status
            });
            console.log('تم تحديث حالة الطلب');
        } catch (error) {
            console.error('خطأ في تحديث الحالة:', error);
            alert('حدث خطأ في تحديث الحالة');
        }
    };

    window.deleteOrder = async (firestoreId) => {
        if (confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
            try {
                await deleteDoc(doc(db, 'orders', firestoreId));
                console.log('تم حذف الطلب بنجاح');
            } catch (error) {
                console.error('خطأ في حذف الطلب:', error);
                alert('حدث خطأ في حذف الطلب');
            }
        }
    };

    // --- Category Management ---
    const categoryForm = document.getElementById('addCategoryForm');
    const adminCategoryList = document.getElementById('adminCategoryList');
    const pCategorySelect = document.getElementById('pCategory');

    function loadCategories() {
        if (!adminCategoryList) return;

        const catRef = collection(db, 'categories');
        onSnapshot(catRef, (snapshot) => {
            const categories = [];
            snapshot.forEach((docSnapshot) => {
                categories.push({ firestoreId: docSnapshot.id, ...docSnapshot.data() });
            });

            // Update product form dropdown
            if (pCategorySelect) {
                pCategorySelect.innerHTML = categories.map(cat => `
                    <option value="${cat.name}">${cat.name}</option>
                `).join('');
            }

            if (categories.length === 0) {
                adminCategoryList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #7f8c8d; padding: 20px;">لا توجد أقسام حالياً.</p>';
                return;
            }

            adminCategoryList.innerHTML = categories.map((cat) => `
                <div class="admin-p-card">
                    <div class="admin-p-info">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <i data-lucide="${cat.icon || 'package'}"></i>
                            <h3 style="margin:0;">${cat.name}</h3>
                        </div>
                        <button class="delete-btn" onclick="deleteCategory('${cat.firestoreId}')">
                            <i data-lucide="trash-2"></i> حذف القسم
                        </button>
                    </div>
                </div>
            `).join('');
            lucide.createIcons();
        });
    }

    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('catName').value;
            const icon = document.getElementById('catIcon').value;

            try {
                await addDoc(collection(db, 'categories'), {
                    name,
                    icon,
                    createdAt: new Date().toISOString()
                });
                categoryForm.reset();
                alert('تمت إضافة القسم بنجاح!');
            } catch (error) {
                console.error('Error adding category:', error);
                alert('حدث خطأ أثناء إضافة القسم.');
            }
        });
    }

    window.deleteCategory = async (firestoreId) => {
        if (confirm('هل أنت متأكد من حذف هذا القسم؟')) {
            try {
                await deleteDoc(doc(db, 'categories', firestoreId));
            } catch (error) {
                console.error('Error deleting category:', error);
                alert('حدث خطأ أثناء حذف القسم.');
            }
        }
    };

    loadAdminProducts();
    loadSliderImages();
    loadOrders();
    loadCategories();
});

