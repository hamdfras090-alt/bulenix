// استيراد Firebase
import { db, collection, getDocs, onSnapshot, query, orderBy, addDoc } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    // Re-initialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // --- Professional Loader Logic ---
    const globalLoader = document.getElementById('globalLoader');
    window.triggerLoader = (callback) => {
        if (!globalLoader) return;

        // Force restart animation by removing and adding class
        globalLoader.classList.remove('active');
        void globalLoader.offsetWidth; // Force reflow
        globalLoader.classList.add('active');

        // Duration: 1.25s (1250ms) as requested
        setTimeout(() => {
            globalLoader.classList.remove('active');
            if (callback) callback();
        }, 1350); // Buffer for fade out transition
    };


    // Trigger loader on page refresh/load (initial load)
    triggerLoader();


    window.copyText = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('✅ تم نسخ رقم الحساب بنجاح');
        });
    };


    const header = document.querySelector('header');
    const logoImg = document.querySelector('.logo img');

    // Add scroll effect to header
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.padding = '5px 0';
            header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
            logoImg.style.height = '60px';
        } else {
            header.style.padding = '10px 0';
            header.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08)';
            logoImg.style.height = '80px';
        }
    });

    // --- Dynamic Product Loading ---
    const productGrid = document.getElementById('productGrid');
    const newProductsSlider = document.getElementById('newProductsSlider');
    let allProducts = [];
    let currentCategory = 'all';

    function renderProducts(filterCategory = 'all', shouldScroll = false) {
        if (!productGrid) return;
        currentCategory = filterCategory;

        // Update section title
        const productSectionTitle = document.querySelector('.products .section-title');
        if (productSectionTitle) {
            if (filterCategory === 'all') {
                productSectionTitle.innerHTML = 'اكتشف أفضل ما لدينا فشتاء 2025';
            } else {
                productSectionTitle.innerHTML = `قسم: <span style="color:var(--primary-orange)">${filterCategory}</span>`;
            }
        }

        // Highlight active category card
        document.querySelectorAll('.category-card').forEach(card => {
            const span = card.querySelector('span');
            if (span && (span.textContent === filterCategory || (span.textContent === 'الكل' && filterCategory === 'all'))) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        if (shouldScroll) {
            const productSection = document.querySelector('.products');
            if (productSection) {
                productSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        const productsRef = collection(db, 'products');
        onSnapshot(productsRef, (snapshot) => {
            allProducts = [];
            snapshot.forEach((doc) => {
                allProducts.push({ id: doc.id, ...doc.data() });
            });

            // Populate Latest Products Slider
            renderNewProductsSlider();

            // Filter products for the main grid
            const filteredProducts = filterCategory === 'all'
                ? allProducts
                : allProducts.filter(p => p.category === filterCategory);

            if (filteredProducts.length === 0) {
                productGrid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 100px 20px;">
                        <i data-lucide="package-search" style="width:64px; height:64px; color:#ccc; margin-bottom:20px;"></i>
                        <h2 style="color:#5a6a7a;">لا توجد منتجات في هذا القسم حالياً</h2>
                    </div>
                `;
            } else {
                productGrid.innerHTML = filteredProducts.map(p => `
                    <div class="product-card" data-product-id="${p.id}">
                        <div class="product-img-container">
                            <img src="${p.img}" alt="${p.title}">
                            <div class="heart-icon" onclick="event.stopPropagation(); toggleFavorite('${escapeHtml(p.title)}', '${p.price}', '${escapeHtml(p.img)}', this)">
                                <i data-lucide="heart"></i>
                            </div>
                        </div>
                        <div class="product-info">
                            <h3 class="product-title">${p.title}</h3>
                            <div class="product-rating">
                                <span class="stars-active">${'★'.repeat(Math.round(p.ratingStats ? p.ratingStats.sum / p.ratingStats.count : 5))}${'☆'.repeat(5 - Math.round(p.ratingStats ? p.ratingStats.sum / p.ratingStats.count : 5))}</span>
                                <span class="rating-count">(${p.ratingStats ? (p.ratingStats.sum / p.ratingStats.count).toFixed(1) : '5.0'})</span>
                            </div>
                            <div class="product-price">${parseFloat(p.price).toFixed(2)} د.ل</div>
                            <span class="free-shipping">شحن مجاني</span>
                            <button class="primary-btn full-width" style="margin-top:10px;" onclick="event.stopPropagation(); addToCart('${escapeHtml(p.title)}', '${p.price}', '${escapeHtml(p.img)}')">أضف للسلة</button>
                        </div>
                    </div>
                `).join('');
            }

            // Click events
            document.querySelectorAll('.product-card').forEach(card => {
                card.addEventListener('click', function () {
                    const productId = this.getAttribute('data-product-id');
                    showProductDetails(productId);
                });
            });

            lucide.createIcons();
        }, (error) => {
            console.error("Products Loading Error:", error);
            if (productGrid) {
                productGrid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:50px; color:red;">
                    <i data-lucide="alert-triangle"></i>
                    <p>عذراً، فشل الاتصال بقاعدة البيانات. تأكد من إعدادات النطاق في Firebase.</p>
                    <small>${error.message}</small>
                </div>`;
                lucide.createIcons();
            }
        });
    }

    // --- Category Loading & Page Logic ---
    const categoryGrid = document.getElementById('categoryGrid');
    const categoryPage = document.getElementById('categoryPage');
    const categoryPageGrid = document.getElementById('categoryPageGrid');
    const categoryPageTitle = document.getElementById('categoryPageTitle');
    const categoryPageCount = document.getElementById('categoryPageCount');
    const closeCategoryPage = document.getElementById('closeCategoryPage');

    window.openCategoryPage = (categoryName) => {
        if (!categoryPage || !categoryPageGrid) return;

        triggerLoader(() => {
            const filtered = allProducts.filter(p => p.category === categoryName);
            categoryPageTitle.textContent = categoryName;
            categoryPageCount.textContent = `${filtered.length} منتجات تم العثور عليها`;

            if (filtered.length === 0) {
                categoryPageGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 50px;">لا توجد منتجات في هذا القسم حالياً.</p>';
            } else {
                categoryPageGrid.innerHTML = filtered.map(p => `
                    <div class="product-card" data-product-id="${p.id}">
                        <div class="product-img-container">
                            <img src="${p.img}" alt="${p.title}">
                            <div class="heart-icon" onclick="event.stopPropagation(); toggleFavorite('${escapeHtml(p.title)}', '${p.price}', '${escapeHtml(p.img)}', this)">
                                <i data-lucide="heart"></i>
                            </div>
                        </div>
                        <div class="product-info">
                            <h3 class="product-title">${p.title}</h3>
                            <div class="product-price">${parseFloat(p.price).toFixed(2)} د.ل</div>
                            <button class="primary-btn full-width" style="margin-top:10px;" onclick="event.stopPropagation(); addToCart('${escapeHtml(p.title)}', '${p.price}', '${escapeHtml(p.img)}')">أضف للسلة</button>
                        </div>
                    </div>
                `).join('');

                // Re-add click listeners
                categoryPageGrid.querySelectorAll('.product-card').forEach(card => {
                    card.addEventListener('click', function () {
                        const productId = this.getAttribute('data-product-id');
                        showProductDetails(productId);
                    });
                });
            }

            categoryPage.classList.add('active');
            document.body.style.overflow = 'hidden';
            lucide.createIcons();
        });
    };

    if (closeCategoryPage) {
        closeCategoryPage.addEventListener('click', () => {
            categoryPage.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    }

    function renderCategories() {
        if (!categoryGrid) return;

        const catRef = collection(db, 'categories');
        onSnapshot(catRef, (snapshot) => {
            const categories = [];
            snapshot.forEach((doc) => {
                categories.push({ id: doc.id, ...doc.data() });
            });

            if (categories.length === 0) {
                categoryGrid.innerHTML = '<p style="text-align:center; width:100%; padding:20px; color:#999;">لا توجد أقسام متوفرة حالياً.</p>';
                return;
            }

            categoryGrid.innerHTML = categories.map(cat => `
                <div class="category-card" onclick="openCategoryPage('${cat.name}')">
                    <i data-lucide="${cat.icon || 'package'}"></i>
                    <span>${cat.name}</span>
                </div>
            `).join('');

            // Add an "All" category (which just scrolls to the products section on the main page)
            categoryGrid.insertAdjacentHTML('afterbegin', `
                <div class="category-card" onclick="renderProducts('all', true)">
                    <i data-lucide="layout-grid"></i>
                    <span>الكل</span>
                </div>
            `);

            lucide.createIcons();
        }, (error) => {
            console.error("Categories Loading Error:", error);
            if (categoryGrid) categoryGrid.innerHTML = `<p style="color:red; text-align:center; width:100%;">فشل تحميل الأقسام: ${error.message}</p>`;
        });
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    // --- Product Detail Logic ---
    window.showProductDetails = (id) => {
        const product = allProducts.find(p => p.id == id);
        if (!product) return;

        const stats = product.ratingStats || { sum: 0, count: 0 };
        const avgRating = stats.count > 0 ? (stats.sum / stats.count).toFixed(1) : "0.0";
        const totalVotes = stats.count;

        // Get this specific user's rating for the stars
        const userRatings = JSON.parse(localStorage.getItem('user_rated_products')) || {};
        const savedRating = userRatings[id] || 0;

        const detailModal = document.getElementById('productDetailModal');
        const detailContent = document.getElementById('detailContent');

        detailContent.innerHTML = `
            <div class="enhanced-detail-grid">
                <div class="enhanced-detail-image">
                    <img src="${product.img}" alt="${product.title}" class="entry-anim-zoom">
                    <div class="image-badge entry-anim-fade">
                        <i data-lucide="shield-check"></i>
                        <span>ضمان بلونيكس الأصلي</span>
                    </div>
                </div>
                <div class="enhanced-detail-info">
                    <div class="detail-header entry-anim-slide">
                        <div class="detail-badge-status ${product.status === 'active' ? 'status-active' : 'status-preorder'}">
                            ${product.status === 'active' ? '<i data-lucide="check-circle" size="14"></i> متوفر في المخزون' : '<i data-lucide="clock" size="14"></i> طلب مسبق (3-5 أيام)'}
                        </div>
                        <h1 class="enhanced-detail-title">${product.title}</h1>
                        
                        <div class="interactive-rating">
                            <span class="price-label">تقييم المنتج: <span class="rating-summary-text">(${avgRating}/5 • ${totalVotes} تقييم)</span></span>
                            <div class="rating-stars" id="ratingStars">
                                ${[1, 2, 3, 4, 5].map(num => `
                                    <i data-lucide="star" size="22" 
                                       class="${num <= savedRating ? 'active' : ''}" 
                                       onclick="rateProduct(${product.id}, ${num})"></i>
                                `).join('')}
                            </div>
                            <span id="ratingFeedback" class="rating-feedback">شكرًا لتقييمك!</span>
                        </div>
                    </div>

                    <div class="enhanced-detail-price entry-anim-slide" style="animation-delay: 0.1s">
                        <div class="price-container">
                            <span class="price-label">السعر الحالي:</span>
                            <span class="price-value">${parseFloat(product.price).toFixed(2)} <small>د.ل</small></span>
                        </div>
                        <div class="delivery-hint">
                            <i data-lucide="truck"></i>
                            <span>توصيل مجاني اليوم</span>
                        </div>
                    </div>

                    <div class="enhanced-detail-divider"></div>

                    <div class="enhanced-detail-desc entry-anim-slide" style="animation-delay: 0.2s">
                        <h3><i data-lucide="align-right"></i> التفاصيل الكاملة</h3>
                        <p>${product.desc || 'هذا المنتج المختار بعناية يمثل قمة هرم الجودة في متجرنا. تم فحصه لضمان أفضل تجربة استخدام ممكنة لزبائننا الكرام.'}</p>
                    </div>

                    <div class="enhanced-detail-features entry-anim-slide" style="animation-delay: 0.3s">
                        <h3><i data-lucide="layers"></i> لماذا تختار بلونيكس؟</h3>
                        <ul class="premium-features-list">
                            <li><i data-lucide="zap"></i> معالجة فورية للطلب</li>
                            <li><i data-lucide="package"></i> تغليف هدايا احترافي مجاني</li>
                            <li><i data-lucide="refresh-cw"></i> سياسة استبدال مرنة</li>
                        </ul>
                    </div>

                    <div class="enhanced-detail-actions entry-anim-slide" style="animation-delay: 0.4s">
                        <button class="enhanced-add-to-cart-btn" onclick="addToCart('${escapeHtml(product.title)}', '${product.price}', '${escapeHtml(product.img)}'); triggerSuccessFeedback(this); setTimeout(() => { document.getElementById('productDetailModal').classList.remove('active'); }, 500);">
                            <i data-lucide="shopping-bag"></i>
                            أضف إلى السلة الآن
                        </button>
                        <button class="enhanced-favorite-btn ${favorites.some(f => f.title === product.title) ? 'is-favorite' : ''}" onclick="toggleFavoriteFromDetail('${escapeHtml(product.title)}', '${product.price}', '${escapeHtml(product.img)}', this)">
                            <i data-lucide="heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        detailModal.classList.add('active');
        document.getElementById('cartOverlay').classList.add('active');
        document.body.style.overflow = 'hidden'; // قفل التمرير في الخلفية عند فتح التفاصيل
        lucide.createIcons();
    };

    window.rateProduct = (productId, rating) => {
        // We update the product object itself in custom_products to simulate "shared" ratings
        // (In a real site, logic would hit a database)
        const products = JSON.parse(localStorage.getItem('custom_products')) || [];
        const pIndex = products.findIndex(p => p.id == productId);

        if (pIndex !== -1) {
            if (!products[pIndex].ratingStats) {
                products[pIndex].ratingStats = { sum: 0, count: 0 };
            }

            // To prevent one local user from rating infinitely and ruining the mock, 
            // we check if they've rated this product before in this browser.
            const userRatings = JSON.parse(localStorage.getItem('user_rated_products')) || {};

            if (userRatings[productId]) {
                const oldRating = userRatings[productId];
                products[pIndex].ratingStats.sum = products[pIndex].ratingStats.sum - oldRating + rating;
            } else {
                products[pIndex].ratingStats.sum += rating;
                products[pIndex].ratingStats.count += 1;
            }

            userRatings[productId] = rating;
            localStorage.setItem('user_rated_products', JSON.stringify(userRatings));
            localStorage.setItem('custom_products', JSON.stringify(products));

            // Update UI Stars
            const stars = document.querySelectorAll('#ratingStars i');
            stars.forEach((star, index) => {
                const starValue = index + 1;
                star.classList.toggle('active', starValue <= rating);
            });

            // Update Average display if it exists (Optional: can refresh modal or just show feedback)
            const feedback = document.getElementById('ratingFeedback');
            feedback.textContent = `تم التقييم بـ ${rating} من 5!`;
            feedback.classList.add('show');
            setTimeout(() => feedback.classList.remove('show'), 2000);

            // Re-render the stars or summary if needed
            const avg = (products[pIndex].ratingStats.sum / products[pIndex].ratingStats.count).toFixed(1);
            const count = products[pIndex].ratingStats.count;
            const ratingSummary = document.querySelector('.rating-summary-text');
            if (ratingSummary) {
                ratingSummary.textContent = `(${avg}/5 • ${count} تقييم)`;
            }
        }
    };


    window.toggleFavoriteFromDetail = (title, price, img, btnElement) => {
        const index = favorites.findIndex(fav => fav.title === title);
        if (index === -1) {
            favorites.push({ title, price, img });
            btnElement.classList.add('is-favorite');
        } else {
            favorites.splice(index, 1);
            btnElement.classList.remove('is-favorite');
        }
    };

    // --- Profile & Tabs Logic ---
    const userModal = document.getElementById('userModal');
    const profileTabs = document.querySelectorAll('.user-profile-modal .tab-btn');
    const tabContents = document.querySelectorAll('.profile-tab-content');

    profileTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            profileTabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabContents.forEach(c => c.classList.remove('active'));
            const targetContent = document.querySelector(`[data-content="${tabId}"]`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            if (tabId === 'track') {
                const trackingInfoModal = document.getElementById('trackingInfoModal');
                if (trackingInfoModal) trackingInfoModal.classList.add('active');
            }

            if (tabId === 'favs') updateFavoritesUI();
            if (tabId === 'orders' || tabId === 'track') updateOrdersUI();
        });
    });

    // Tracking Info Modal Logic
    const trackingInfoModal = document.getElementById('trackingInfoModal');
    const closeTrackingInfo = document.getElementById('closeTrackingInfo');
    const skipTrackingInfo = document.getElementById('skipTrackingInfo');

    if (closeTrackingInfo) {
        closeTrackingInfo.addEventListener('click', () => trackingInfoModal.classList.remove('active'));
    }
    if (skipTrackingInfo) {
        skipTrackingInfo.addEventListener('click', () => trackingInfoModal.classList.remove('active'));
    }

    function updateUserBadge() {
        const badge = document.getElementById('userOrderBadge');
        const customerOrders = JSON.parse(localStorage.getItem('customer_orders')) || [];
        const lastSeenCount = parseInt(localStorage.getItem('last_seen_orders_count') || '0');

        if (badge) {
            const newOrdersCount = customerOrders.length - lastSeenCount;
            if (newOrdersCount > 0) {
                badge.textContent = newOrdersCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }
    updateUserBadge(); // Initial call

    // Dark Mode Toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);

            // Visual feedback
            themeToggle.style.transform = 'scale(1.1)';
            setTimeout(() => themeToggle.style.transform = 'scale(1)', 200);
        });
    }

    // Load saved theme on page load
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    // --- Cart & Checkout Logic ---
    let cart = [];
    let favorites = [];
    let orders = JSON.parse(localStorage.getItem('orders')) || [];

    const cartDrawer = document.getElementById('cartDrawer');
    const cartOverlay = document.getElementById('cartOverlay');
    const checkoutModal = document.getElementById('checkoutModal');
    const cartBadge = document.querySelector('.cart-count');
    const cartItemsList = document.getElementById('cartItemsList');
    const cartTotalAmount = document.getElementById('cartTotalAmount');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const favoritesList = document.getElementById('favoritesList');
    const ordersList = document.getElementById('ordersList');

    // Open Cart
    const cartBtn = document.querySelector('[data-lucide="shopping-cart"]');
    if (cartBtn) {
        cartBtn.parentElement.addEventListener('click', (e) => {
            e.preventDefault();
            cartDrawer.classList.add('active');
            cartOverlay.classList.add('active');
        });
    }

    // Gift Button & Hero Banner Logic (Show Modal with Copy)
    const giftBtn = document.getElementById('giftBtn');
    const heroBanner = document.getElementById('heroBanner');

    const showCouponModal = () => {
        const giftModal = document.getElementById('productDetailModal');
        const giftContent = document.getElementById('detailContent');

        giftContent.innerHTML = `
            <div class="coupon-gift-content">
                <i data-lucide="gift" size="64"></i>
                <h2>هديتك من بلونيكس!</h2>
                <p>استخدم الكود التالي عند الدفع للحصول على خصم 5%</p>
                <div class="coupon-box">
                    <span id="couponText">BLUE5</span>
                    <button id="copyCouponBtn" class="copy-btn">
                        <i data-lucide="copy"></i>
                        نسخ الكود
                    </button>
                </div>
                <p style="font-size: 13px; color: #777;">صالح لفترة محدودة على جميع المنتجات</p>
            </div>
        `;

        giftModal.classList.add('active');
        document.getElementById('cartOverlay').classList.add('active');
        lucide.createIcons();

        document.getElementById('copyCouponBtn').addEventListener('click', function () {
            const text = document.getElementById('couponText').textContent;
            navigator.clipboard.writeText(text).then(() => {
                this.innerHTML = '<i data-lucide="check"></i> تم النسخ!';
                lucide.createIcons();
                setTimeout(() => {
                    this.innerHTML = '<i data-lucide="copy"></i> نسخ الكود';
                    lucide.createIcons();
                }, 2000);
            });
        });
    };

    if (giftBtn) {
        giftBtn.addEventListener('click', showCouponModal);
    }

    // --- Hero Slider Logic ---
    let currentSlide = 0;
    let autoSlideInterval;

    function renderHeroSlider() {
        const sliderSection = document.querySelector('.hero-slider-section');
        const slider = document.getElementById('heroSlider');
        const dotsContainer = document.getElementById('heroDots');
        if (!slider || !sliderSection) return;

        // قراءة الصور من Firestore
        const sliderRef = collection(db, 'sliderImages');
        onSnapshot(sliderRef, (snapshot) => {
            const sliderImages = [];
            snapshot.forEach((docSnap) => {
                sliderImages.push({ id: docSnap.id, ...docSnap.data() });
            });

            if (sliderImages.length === 0) {
                // بدلاً من الإخفاء مباشرة، سنعرض صورة افتراضية أو ننتظر
                sliderSection.style.display = 'none';
                return;
            }

            // إظهار القسم
            sliderSection.style.display = 'block';

            // مسح المحتوى القديم وإضافة الصور الجديدة
            slider.innerHTML = sliderImages.map(img => `
                <img src="${img.img}" alt="Slide" class="slider-image" 
                     onerror="this.style.display='none'" 
                     onclick="showCouponModal()">
            `).join('');

            // إنشاء النقاط (Dots)
            if (dotsContainer) {
                dotsContainer.innerHTML = sliderImages.map((_, i) => `
                    <div class="dot ${i === 0 ? 'dot--active' : ''}" data-index="${i}"></div>
                `).join('');
            }

            // إعادة تعيين العداد وإيقاف أي سلايدر تلقائي سابق
            currentSlide = 0;
            const isRTL = document.documentElement.dir === 'rtl';
            const multiplier = isRTL ? 1 : -1;
            slider.style.transform = `translateX(0%)`;

            lucide.createIcons();
            initHeroSliderControls(sliderImages.length);
        }, (error) => {
            console.error("Firestore Slider Error:", error);
        });
    }


    function initHeroSliderControls(totalSlides) {
        const container = document.getElementById('heroSlider');
        const dots = document.querySelectorAll('.dot');
        const prev = document.getElementById('heroPrev');
        const next = document.getElementById('heroNext');

        if (!container) return;

        function moveSlide(index) {
            if (index >= totalSlides) index = 0;
            if (index < 0) index = totalSlides - 1;

            currentSlide = index;
            const isRTL = document.documentElement.dir === 'rtl' || document.dir === 'rtl';

            // في بعض المتصفحات عند استخدام flex و RTL، قد تختلف طريقة الترجمة
            // سنستخدم التحريك بالنسبة المئوية لضمان التوافق
            const multiplier = isRTL ? 1 : -1;
            container.style.transform = `translateX(${currentSlide * 100 * multiplier}%)`;

            // تحديث النقاط
            document.querySelectorAll('.dot').forEach((dot, i) => {
                dot.classList.toggle('dot--active', i === currentSlide);
            });

            startAutoSlide(totalSlides);
        }

        // إزالة المستمعين القدامى (عبر استبدال العناصر أو إضافة التحقق) لإيقاف التكرار
        if (next) {
            const newNext = next.cloneNode(true);
            next.parentNode.replaceChild(newNext, next);
            newNext.addEventListener('click', () => moveSlide(currentSlide + 1));
        }

        if (prev) {
            const newPrev = prev.cloneNode(true);
            prev.parentNode.replaceChild(newPrev, prev);
            newPrev.addEventListener('click', () => moveSlide(currentSlide - 1));
        }

        document.querySelectorAll('.dot').forEach(dot => {
            dot.addEventListener('click', () => {
                moveSlide(parseInt(dot.dataset.index));
            });
        });

        startAutoSlide(totalSlides);
    }

    function startAutoSlide(total) {
        clearInterval(autoSlideInterval);
        if (total <= 1) return;
        autoSlideInterval = setInterval(() => {
            const nextIdx = (currentSlide + 1) % total;

            // Re-select elements inside interval to be safe
            const container = document.getElementById('heroSlider');
            const dots = document.querySelectorAll('.dot');

            currentSlide = nextIdx;
            if (container) {
                const isRTL = document.documentElement.dir === 'rtl';
                const multiplier = isRTL ? 1 : -1;
                container.style.transform = `translateX(${currentSlide * 100 * multiplier}%)`;
            }

            if (dots.length > 0) {
                dots.forEach((dot, i) => {
                    dot.classList.toggle('dot--active', i === currentSlide);
                });
            }
        }, 3000); // 3 seconds interval
    }


    // Open Profile
    const userBtn = document.querySelector('[data-lucide="user"]');
    if (userBtn) {
        userBtn.parentElement.addEventListener('click', (e) => {
            e.preventDefault();
            userModal.classList.add('active');
            cartOverlay.classList.add('active');
            updateFavoritesUI();
            updateOrdersUI();

            // Mark as seen and clear badge
            const customerOrders = JSON.parse(localStorage.getItem('customer_orders')) || [];
            localStorage.setItem('last_seen_orders_count', customerOrders.length.toString());
            updateUserBadge();
        });
    }

    // Success Modal Elements
    const successModal = document.getElementById('successModal');
    const closeSuccessBtn = document.getElementById('closeSuccessBtn');
    const displayOrderId = document.getElementById('displayOrderId');

    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', () => {
            if (successModal) successModal.classList.remove('active');
            if (cartOverlay) cartOverlay.classList.remove('active');
        });
    }

    const closeElements = [
        document.getElementById('closeCart'),
        cartOverlay,
        document.getElementById('closeCheckout'),
        document.getElementById('closeUser'),
        document.getElementById('closeDetail'),
        document.getElementById('closeSuccessBtn'),
        document.getElementById('closeTrackingInfo'),
        document.getElementById('skipTrackingInfo')
    ];
    closeElements.forEach(el => {
        if (el) {
            el.addEventListener('click', () => {
                cartDrawer.classList.remove('active');
                if (cartOverlay) cartOverlay.classList.remove('active');
                checkoutModal.classList.remove('active');
                if (userModal) userModal.classList.remove('active');
                if (document.getElementById('productDetailModal')) document.getElementById('productDetailModal').classList.remove('active');
                if (successModal) successModal.classList.remove('active');
                if (trackingInfoModal) trackingInfoModal.classList.remove('active');
                document.body.style.overflow = 'auto'; // إعادة التمرير عند الإغلاق
            });
        }
    });

    window.addToCart = (title, price, img) => {
        const item = { title, price: parseFloat(price), img };
        cart.push(item);
        updateCartUI();
        cartDrawer.classList.add('active');
        if (cartOverlay) cartOverlay.classList.add('active');
    };



    function updateCartUI() {
        if (cartBadge) {
            cartBadge.textContent = cart.length;
            cartBadge.style.display = cart.length > 0 ? 'block' : 'none';
        }
        if (!cartItemsList) return;
        if (cart.length === 0) {
            cartItemsList.innerHTML = '<p class="empty-cart-msg">سلتك فارغة حالياً.</p>';
            if (cartTotalAmount) cartTotalAmount.textContent = '0.00 د.ل';
            if (checkoutBtn) checkoutBtn.disabled = true;
            return;
        }
        let total = 0;
        cartItemsList.innerHTML = cart.map((item, index) => {
            total += item.price;
            return `
                <div class="cart-item">
                    <img src="${item.img}" alt="${item.title}" class="cart-item-img">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.title}</div>
                        <div class="cart-item-price">${item.price.toFixed(2)} د.ل</div>
                    </div>
                </div>
            `;
        }).join('');
        if (cartTotalAmount) cartTotalAmount.textContent = `${total.toFixed(2)} د.ل`;
        if (checkoutBtn) checkoutBtn.disabled = false;
    }

    window.toggleFavorite = (title, price, img, btnElement) => {
        const index = favorites.findIndex(fav => fav.title === title);
        if (index === -1) {
            favorites.push({ title, price, img });
            btnElement.style.color = 'red';
            btnElement.style.fill = 'red';
        } else {
            favorites.splice(index, 1);
            btnElement.style.color = '';
            btnElement.style.fill = 'none';
        }
    };

    function updateFavoritesUI() {
        if (!favoritesList) return;
        if (favorites.length === 0) {
            favoritesList.innerHTML = '<div class="empty-state"><i data-lucide="heart"></i><p>لا توجد منتجات محفوظة</p></div>';
            lucide.createIcons();
            return;
        }
        favoritesList.innerHTML = favorites.map(fav => `
            <div class="fav-card">
                <img src="${fav.img}" alt="${fav.title}" class="fav-card-img">
                <div class="fav-card-content">
                    <div class="fav-card-title">${fav.title}</div>
                    <div class="fav-card-price">${parseFloat(fav.price).toFixed(2)} د.ل</div>
                </div>
            </div>
        `).join('');
    }

    function updateOrdersUI() {
        const ordersList = document.getElementById('ordersList');
        const trackOrderContent = document.getElementById('trackOrderContent');
        const customerOrders = JSON.parse(localStorage.getItem('customer_orders')) || [];

        if (ordersList) {
            if (customerOrders.length === 0) {
                ordersList.innerHTML = '<div class="empty-state"><i data-lucide="package"></i><p>لا توجد طلبات سابقة بعد</p></div>';
            } else {
                ordersList.innerHTML = customerOrders.map(order => `
                    <div class="profile-order-item">
                        <div class="order-id">طلب رقم #${order.id}</div>
                        <div class="order-total">${order.total} د.ل</div>
                        <div class="order-date">${new Date(order.timestamp).toLocaleDateString('ar-LY')}</div>
                    </div>
                `).join('');
            }
        }

        if (trackOrderContent) {
            if (customerOrders.length === 0) {
                trackOrderContent.innerHTML = '<div class="empty-state"><i data-lucide="truck"></i><p>لا توجد طلبات لتتبعها حالياً</p></div>';
            } else {
                trackOrderContent.innerHTML = customerOrders.map(order => {
                    const statusClass = order.status || 'pending';
                    const statusText = getStatusText(statusClass);
                    const steps = [
                        { id: 'pending', label: 'قيد المراجعة' },
                        { id: 'processing', label: 'قيد التجهيز' },
                        { id: 'shipping', label: 'قيد التوصيل' },
                        { id: 'completed', label: 'تم التوصيل' }
                    ];

                    let activeIndex = steps.findIndex(s => s.id === statusClass);
                    if (activeIndex === -1) activeIndex = 0;

                    return `
                        <div class="tracking-card">
                            <div class="tracking-header">
                                <span>طلب رقم #${order.id}</span>
                                <span class="status-badge ${statusClass}">${statusText}</span>
                            </div>
                            <div class="tracking-stepper">
                                <div class="stepper-line">
                                    <div class="stepper-progress" style="width: ${(activeIndex / (steps.length - 1)) * 100}%"></div>
                                    <div class="motorcycle-wrapper" style="right: calc(${(activeIndex / (steps.length - 1)) * 100}% - 15px)">
                                        <i data-lucide="bike" class="motorcycle-icon"></i>
                                    </div>
                                </div>
                                ${steps.map((step, index) => `
                                    <div class="step ${index <= activeIndex ? 'active' : ''}">
                                        <div class="step-circle">${index < activeIndex ? '✓' : index + 1}</div>
                                        <div class="step-label">${step.label}</div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="order-items-minimal">
                                ${order.items.slice(0, 2).map(item => `<span>${item.title}</span>`).join(', ')}
                                ${order.items.length > 2 ? ` (+${order.items.length - 2} أخرى)` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
        lucide.createIcons();
    }

    function getStatusText(status) {
        const statusMap = {
            'pending': 'قيد المراجعة',
            'processing': 'قيد التجهيز',
            'shipping': 'قيد التوصيل',
            'completed': 'تم التوصيل',
            'cancelled': 'ملغي'
        };
        return statusMap[status] || 'قيد المراجعة';
    }

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            cartDrawer.classList.remove('active');
            checkoutModal.classList.add('active');
            renderCheckoutSummary();
        });
    }



    // Bank Transfer Confirmation Logic
    const confirmTransferBtn = document.getElementById('confirmTransferBtn');
    let isTransferConfirmed = false;

    if (confirmTransferBtn) {
        confirmTransferBtn.addEventListener('click', () => {
            isTransferConfirmed = !isTransferConfirmed;
            if (isTransferConfirmed) {
                confirmTransferBtn.innerHTML = '✓ تم تأكيد الحوالة (إلغاء؟)';
                confirmTransferBtn.classList.add('confirmed');
            } else {
                confirmTransferBtn.innerHTML = 'تأكيد الدفع بالحوالة';
                confirmTransferBtn.classList.remove('confirmed');
            }
        });
    }

    // Payment Method Toggle
    const paymentOptions = document.querySelectorAll('.payment-option');
    const bankDetails = document.getElementById('bankTransferDetails');
    const bankDetailsModal = document.getElementById('bankDetailsModal');
    let selectedPayment = 'cod';

    paymentOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            paymentOptions.forEach(p => p.classList.remove('active'));
            opt.classList.add('active');
            selectedPayment = opt.getAttribute('data-payment');

            // Reset transfer confirmation when switching
            isTransferConfirmed = false;
            const currentConfirmBtn = document.getElementById('confirmTransferBtn');
            if (currentConfirmBtn) {
                currentConfirmBtn.innerHTML = 'تأكيد الدفع بالحوالة';
                currentConfirmBtn.classList.remove('confirmed');
            }

            if (selectedPayment === 'bank') {
                if (bankDetails) bankDetails.style.display = 'block';
                if (bankDetailsModal) bankDetailsModal.classList.add('active');
            } else {
                if (bankDetails) bankDetails.style.display = 'none';
            }
        });
    });

    // Bank Details Modal Closing
    const closeBankModal = document.getElementById('closeBankModal');
    const skipBankModal = document.getElementById('skipBankModal');

    if (closeBankModal) {
        closeBankModal.addEventListener('click', () => {
            bankDetailsModal.classList.remove('active');
        });
    }

    if (skipBankModal) {
        skipBankModal.addEventListener('click', () => {
            bankDetailsModal.classList.remove('active');
        });
    }

    let currentDiscount = 0;

    const applyCouponBtn = document.getElementById('applyCouponBtn');
    if (applyCouponBtn) {
        applyCouponBtn.addEventListener('click', () => {
            const code = document.getElementById('couponCode').value.trim().toUpperCase();
            if (code === 'BLUE5') {
                currentDiscount = 0.05;
                alert('✅ تم تطبيق كود التخفيض بنجاح! خصم 5%');
                renderCheckoutSummary();
            } else if (code === '') {
                alert('يرجى إدخال كود التخفيض أولاً.');
            } else {
                alert('❌ كود التخفيض غير صالح.');
                currentDiscount = 0;
                renderCheckoutSummary();
            }
        });
    }

    function renderCheckoutSummary() {
        let total = 0;
        cart.forEach(item => total += item.price);

        const subtotalEl = document.getElementById('checkoutSubtotal');
        const discountRow = document.getElementById('discountRow');
        const discountEl = document.getElementById('checkoutDiscount');
        const finalTotalEl = document.getElementById('checkoutFinalTotal');

        if (subtotalEl) subtotalEl.textContent = `${total.toFixed(2)} د.ل`;

        if (currentDiscount > 0) {
            const discountAmount = total * currentDiscount;
            const finalTotal = total - discountAmount;

            if (discountRow) discountRow.style.display = 'flex';
            if (discountEl) discountEl.textContent = `-${discountAmount.toFixed(2)} د.ل`;

            if (finalTotalEl) {
                finalTotalEl.innerHTML = `
                    <div class="total-amount-wrapper">
                        <span>المطلوب دفعه:</span>
                        <div>
                            <span class="old-price-strike">${total.toFixed(2)} د.ل</span>
                            <span style="color: #258635;">${finalTotal.toFixed(2)} د.ل</span>
                        </div>
                    </div>
                `;
            }
        } else {
            if (discountRow) discountRow.style.display = 'none';
            if (finalTotalEl) {
                finalTotalEl.innerHTML = `
                    <div class="total-amount-wrapper">
                        <span>المطلوب دفعه:</span>
                        <span>${total.toFixed(2)} د.ل</span>
                    </div>
                `;
            }
        }
    }

    const purchaseForm = document.getElementById('purchaseForm');
    if (purchaseForm) {
        purchaseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (selectedPayment === 'bank' && !isTransferConfirmed) {
                alert('⚠️ يرجى النقر على زر "تأكيد الدفع بالحوالة" قبل إتمام الطلب.');
                return;
            }

            triggerLoader(() => {
                // Get customer information
                const customerName = document.getElementById('checkoutName').value;
                const customerPhone = document.getElementById('checkoutPhone').value;
                const customerCity = document.getElementById('checkoutCity').value;
                const customerArea = document.getElementById('checkoutArea').value;
                const customerAddress = document.getElementById('checkoutAddress').value;

                // Calculate total
                let total = 0;
                cart.forEach(item => total += item.price);
                const discountAmount = total * currentDiscount;
                const finalTotal = total - discountAmount;

                // Create order for user's profile
                const userOrder = {
                    id: Math.floor(Math.random() * 10000),
                    total: finalTotal.toFixed(2),
                    date: new Date().toLocaleDateString('ar-LY')
                };

                orders.push(userOrder);
                localStorage.setItem('orders', JSON.stringify(orders));

                // Create detailed order for admin dashboard
                const adminOrder = {
                    id: Math.floor(Math.random() * 100000),
                    timestamp: Date.now(),
                    customerName: customerName,
                    customerPhone: customerPhone,
                    customerCity: customerCity,
                    customerArea: customerArea,
                    customerAddress: customerAddress,
                    items: cart.map(item => ({
                        title: item.title,
                        price: item.price
                        // Image removed to save space in localStorage
                    })),
                    total: finalTotal.toFixed(2),
                    status: 'pending',
                    paymentMethod: selectedPayment
                };

                // حفظ الطلب في Firestore
                addDoc(collection(db, 'orders'), adminOrder).then(() => {
                    console.log('تم حفظ الطلب بنجاح في Firebase');
                }).catch((error) => {
                    console.error('خطأ في حفظ الطلب:', error);
                });

                // Show Success Modal instead of alert
                if (displayOrderId) displayOrderId.textContent = `#${adminOrder.id}`;
                if (successModal) {
                    successModal.classList.add('active');
                    if (cartOverlay) cartOverlay.classList.add('active');
                }

                // Reset form, cart and state
                purchaseForm.reset();
                cart = [];
                currentDiscount = 0;
                selectedPayment = 'cod';
                isTransferConfirmed = false;

                // Reset UI components
                const finalBankBox = document.getElementById('bankTransferDetails');
                const finalConfirmBtn = document.getElementById('confirmTransferBtn');
                const finalPaymentOptions = document.querySelectorAll('.payment-option');

                if (finalBankBox) finalBankBox.style.display = 'none';
                if (finalPaymentOptions) {
                    finalPaymentOptions.forEach(p => p.classList.remove('active'));
                    const codOption = document.querySelector('.payment-option[data-payment="cod"]');
                    if (codOption) codOption.classList.add('active');
                }
                if (finalConfirmBtn) {
                    finalConfirmBtn.innerHTML = 'تأكيد الدفع بالحوالة';
                    finalConfirmBtn.classList.remove('confirmed');
                }

                updateCartUI();
                checkoutModal.classList.remove('active');
                if (cartOverlay) cartOverlay.classList.remove('active');

                // Update User Badge after order
                updateUserBadge();

                // Hide discount row if visible
                const discountRow = document.getElementById('discountRow');
                if (discountRow) discountRow.style.display = 'none';
            });
        });
    }


    // --- Search Functionality ---
    const searchInput = document.querySelector('.search-container input');
    const searchBtn = document.querySelector('.search-btn');

    if (searchInput && searchBtn) {
        // Search on button click
        searchBtn.addEventListener('click', () => {
            performSearch(searchInput.value);
        });

        // Search on Enter key
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch(searchInput.value);
            }
        });



        // Real-time search as user types
        searchInput.addEventListener('input', (e) => {
            performSearch(e.target.value);
        });
    } else {
        console.warn("Search elements not found in current view.");
    }

    function performSearch(query) {
        if (!productGrid) return;

        const searchQuery = query.trim().toLowerCase();

        if (!searchQuery) {
            renderProducts();
            return;
        }

        const filteredProducts = allProducts.filter(product => {
            return (product.title && product.title.toLowerCase().includes(searchQuery)) ||
                (product.desc && product.desc.toLowerCase().includes(searchQuery)) ||
                (product.category && product.category.toLowerCase().includes(searchQuery));
        });

        if (filteredProducts.length === 0) {
            productGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 100px 20px;">
                    <i data-lucide="search-x" style="width:64px; height:64px; color:#ccc; margin-bottom:20px;"></i>
                    <h2 style="color:#5a6a7a;">لم نجد نتائج لـ "${query}"</h2>
                    <p style="color:#7f8c8d;">حاول البحث بكلمات أخرى</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        // Scroll to results if any found
        productGrid.scrollIntoView({ behavior: 'smooth', block: 'center' });

        productGrid.innerHTML = filteredProducts.map(p => `
            <div class="product-card" data-product-id="${p.id}">
                <div class="product-img-container">
                    <img src="${p.img}" alt="${p.title}">
                    <div class="heart-icon" onclick="event.stopPropagation(); toggleFavorite('${escapeHtml(p.title)}', '${p.price}', '${escapeHtml(p.img)}', this)">
                        <i data-lucide="heart"></i>
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-title">${p.title}</h3>
                    <div class="product-rating"><span>★★★★★ (جديد)</span></div>
                    <div class="product-price">${parseFloat(p.price).toFixed(2)} د.ل</div>
                    <span class="free-shipping">شحن مجاني</span>
                    <button class="primary-btn full-width" style="margin-top:10px;" onclick="event.stopPropagation(); addToCart('${escapeHtml(p.title)}', '${p.price}', '${escapeHtml(p.img)}')">أضف للسلة</button>
                </div>
            </div>
        `).join('');

        // Re-bind click events
        productGrid.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', function () {
                const productId = this.getAttribute('data-product-id');
                showProductDetails(productId);
            });
        });

        lucide.createIcons();
    }

    // --- New Products Slider ---
    function renderNewProductsSlider() {
        const slider = document.getElementById('newProductsSlider');
        if (!slider) return;

        if (allProducts.length === 0) {
            slider.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #7f8c8d; grid-column: 1/-1;">
                    <i data-lucide="inbox" style="width:60px; height:60px; margin-bottom:15px; color:#ddd;"></i>
                    <p>لا توجد منتجات لعرضها حالياً</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        // Get latest 10 products (sorted by createdAt - newest first)
        const latestProducts = [...allProducts]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10);

        slider.innerHTML = latestProducts.map(p => {
            const price = parseFloat(p.price);
            return `
        <div class="product-card" data-product-id="${p.id}" onclick="showProductDetails('${p.id}')" style="min-width: 280px; margin: 10px;">
            <div class="product-img-container">
                <img src="${p.img}" alt="${p.title}">
                <span class="new-badge" style="position: absolute; top: 10px; left: 10px; background: var(--primary-orange); color: white; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; z-index: 5;">جديد</span>
            </div>
            <div class="product-info">
                <h3 class="product-title">${p.title}</h3>
                <div class="product-price">${price.toFixed(2)} د.ل</div>
                <button class="primary-btn full-width" style="margin-top:10px;" onclick="event.stopPropagation(); addToCart('${escapeHtml(p.title)}', '${p.price}', '${escapeHtml(p.img)}')">أضف للسلة</button>
            </div>
        </div>
    `}).join('');

        lucide.createIcons();
        initSlider();
    }

    function initSlider() {
        const slider = document.getElementById('newProductsSlider');
        const prevBtn = document.getElementById('sliderPrev');
        const nextBtn = document.getElementById('sliderNext');

        if (!slider || !prevBtn || !nextBtn) return;

        const scrollAmount = 300;
        let autoScrollInterval;

        const startAutoScroll = () => {
            clearInterval(autoScrollInterval);
            autoScrollInterval = setInterval(() => {
                const maxScroll = slider.scrollWidth - slider.clientWidth;
                // في RTL، التمرير لليسار (التالي) يكون بقيم سالبة
                if (Math.abs(slider.scrollLeft) >= maxScroll - 10) {
                    slider.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    slider.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                }
            }, 3000);
        };

        nextBtn.addEventListener('click', () => {
            slider.scrollBy({
                left: -scrollAmount,
                behavior: 'smooth'
            });
            startAutoScroll();
        });

        prevBtn.addEventListener('click', () => {
            slider.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });
            startAutoScroll();
        });

        // Auto update button states based on scroll position
        slider.addEventListener('scroll', () => {
            const maxScroll = slider.scrollWidth - slider.clientWidth;
            prevBtn.disabled = slider.scrollLeft <= 0;
            nextBtn.disabled = slider.scrollLeft >= maxScroll - 10;
        });

        // تشغيل التمرير التلقائي عند التحميل
        startAutoScroll();

        // إيقاف التمرير التلقائي عند التفاعل اليدوي (اختياري، هنا سنعيد تشغيله بعد الضغط)
        slider.addEventListener('touchstart', () => clearInterval(autoScrollInterval), { passive: true });
        slider.addEventListener('touchend', startAutoScroll, { passive: true });
    }

    window.triggerSuccessFeedback = (btn) => {
        const originalContent = btn.innerHTML;
        btn.classList.add('success-state');
        btn.innerHTML = '<i data-lucide="check-circle"></i> تم الإضافة بنجاح!';
        lucide.createIcons();

        // Add a subtle bounce effect
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => btn.style.transform = '', 100);

        setTimeout(() => {
            btn.classList.remove('success-state');
            btn.innerHTML = originalContent;
            lucide.createIcons();
        }, 2000);
    };

    // --- Mobile Bottom Nav Logic ---
    const mobileBottomHome = document.getElementById('homeHomeBtn');
    const mobileBottomCat = document.getElementById('mobileCatBtn');
    const mobileBottomUser = document.getElementById('mobileUserBtn');
    const mobileBottomCart = document.getElementById('mobileCartBtn');

    if (mobileBottomHome) {
        mobileBottomHome.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
            mobileBottomHome.classList.add('active');
        });
    }

    if (mobileBottomCat) {
        mobileBottomCat.addEventListener('click', (e) => {
            e.preventDefault();
            const catSection = document.querySelector('.categories-section');
            if (catSection) {
                catSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
            mobileBottomCat.classList.add('active');
        });
    }

    if (mobileBottomUser) {
        mobileBottomUser.addEventListener('click', (e) => {
            e.preventDefault();
            if (userModal) {
                userModal.classList.add('active');
                cartOverlay.classList.add('active');
                updateFavoritesUI();
                updateOrdersUI();
            }
            document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
            mobileBottomUser.classList.add('active');
        });
    }

    if (mobileBottomCart) {
        mobileBottomCart.addEventListener('click', (e) => {
            e.preventDefault();
            if (cartDrawer) {
                cartDrawer.classList.add('active');
                cartOverlay.classList.add('active');
            }
            document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
            mobileBottomCart.classList.add('active');
        });
    }

    // Update active state on scroll
    window.addEventListener('scroll', () => {
        const catSection = document.querySelector('.categories-section');
        if (catSection && mobileBottomCat) {
            const rect = catSection.getBoundingClientRect();
            if (rect.top <= 100 && rect.bottom >= 100) {
                document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
                mobileBottomCat.classList.add('active');
            } else if (window.scrollY < 200 && mobileBottomHome) {
                document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
                mobileBottomHome.classList.add('active');
            }
        }
    });

    renderProducts();
    renderCategories();
    renderHeroSlider();
    renderNewProductsSlider();
});
