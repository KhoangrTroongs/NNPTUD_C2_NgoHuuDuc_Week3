// API URL
const API_URL = 'https://api.escuelajs.co/api/v1/products';

// Biến toàn cục để lưu trữ dữ liệu sản phẩm
let allProducts = [];
let filteredProducts = []; // Sản phẩm sau khi tìm kiếm
let currentPage = 1;
let pageSize = 10; // Mặc định 10 sản phẩm/trang
let currentSort = { field: null, order: null }; // Trạng thái sắp xếp hiện tại

// Hàm getAll để lấy tất cả sản phẩm từ API
async function getAll() {
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const tableElement = document.getElementById('productTable');
    const statsElement = document.getElementById('stats');

    try {
        // Hiển thị loading
        loadingElement.style.display = 'block';
        errorElement.style.display = 'none';
        tableElement.style.display = 'none';
        statsElement.style.display = 'none';

        // Gọi API
        const response = await fetch(API_URL);

        // Kiểm tra response
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Lấy dữ liệu JSON
        const products = await response.json();

        // Kiểm tra dữ liệu
        if (!products || products.length === 0) {
            throw new Error('Không có dữ liệu sản phẩm');
        }

        // Lưu vào biến toàn cục
        allProducts = products;
        filteredProducts = products;

        // Xóa loading
        loadingElement.style.display = 'none';

        // Hiển thị thống kê
        displayStats(products);
        statsElement.style.display = 'flex';

        // Hiển thị search box
        document.getElementById('searchContainer').style.display = 'flex';

        // Hiển thị pagination
        document.getElementById('paginationTop').style.display = 'flex';
        document.getElementById('paginationBottom').style.display = 'flex';

        // Hiển thị bảng với phân trang
        currentPage = 1;
        renderPage();
        tableElement.style.display = 'table';

        // Khởi tạo event listeners
        initializeSearch();
        initializePagination();
        initializeSorting();
        initializeGallery();

        console.log(`✅ Đã tải thành công ${products.length} sản phẩm`);

        // Debug: In ra một vài URL hình ảnh để kiểm tra
        if (products.length > 0) {
            console.log('🖼️ Mẫu URL hình ảnh:', products[0].images);
        }

        return products;

    } catch (error) {
        // Xử lý lỗi
        console.error('❌ Lỗi khi tải dữ liệu:', error);
        loadingElement.style.display = 'none';
        errorElement.style.display = 'block';
        errorElement.textContent = `Lỗi: ${error.message}. Vui lòng thử lại sau.`;
        return null;
    }
}

// Hàm hiển thị thống kê
function displayStats(products) {
    const totalProducts = products.length;

    // Đếm số danh mục duy nhất
    const categories = new Set(products.map(p => p.category.name));
    const totalCategories = categories.size;

    // Tính giá trung bình
    const avgPrice = (products.reduce((sum, p) => sum + p.price, 0) / totalProducts).toFixed(2);

    document.getElementById('totalProducts').textContent = totalProducts;
    document.getElementById('totalCategories').textContent = totalCategories;
    document.getElementById('avgPrice').textContent = `$${avgPrice}`;
}

// Hàm làm sạch URL hình ảnh (loại bỏ dấu ngoặc kép và ký tự lạ)
function cleanImageUrl(url) {
    if (!url) return null;

    // Chuyển thành string và loại bỏ khoảng trắng
    let cleanUrl = String(url).trim();

    // Loại bỏ dấu ngoặc kép, ngoặc vuông ở đầu và cuối
    cleanUrl = cleanUrl.replace(/^["'\[\s]+|["'\]\s]+$/g, '');

    // Loại bỏ tất cả dấu ngoặc kép và ngoặc vuông còn lại
    cleanUrl = cleanUrl.replace(/["'\[\]]/g, '');

    // Kiểm tra xem có phải URL hợp lệ không
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
        // Bỏ qua các URL placeholder mặc định
        if (cleanUrl.includes('placehold.co') && !cleanUrl.includes('text=')) {
            return null;
        }
        return cleanUrl;
    }

    return null;
}

// Hàm hiển thị sản phẩm trong bảng
function displayProducts(products, searchTerm = '') {
    const tableBody = document.getElementById('productTableBody');
    tableBody.innerHTML = ''; // Xóa nội dung cũ

    products.forEach((product, index) => {
        const row = document.createElement('tr');

        // Lưu description vào data attribute
        row.setAttribute('data-description', product.description);

        // Lấy hình ảnh từ mảng images và làm sạch URL
        let imageUrls = [];

        if (product.images && product.images.length > 0) {
            // Làm sạch tất cả URLs và lọc bỏ null
            imageUrls = product.images
                .map(url => cleanImageUrl(url))
                .filter(url => url !== null);
        }

        // Tạo placeholder với tên sản phẩm
        const productName = encodeURIComponent(product.title.substring(0, 20));
        const defaultPlaceholder = `https://placehold.co/80x80/667eea/white?text=${productName}`;
        const imageUrl = imageUrls.length > 0 ? imageUrls[0] : defaultPlaceholder;

        // Tạo các cell riêng biệt
        const tdId = document.createElement('td');
        tdId.textContent = product.id;

        const tdImage = document.createElement('td');
        tdImage.className = 'image-cell';

        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = product.title;
        img.className = 'product-image';

        // Lưu tất cả URLs vào data attribute để dùng cho gallery
        img.setAttribute('data-images', JSON.stringify(imageUrls.length > 0 ? imageUrls : [defaultPlaceholder]));
        img.setAttribute('data-product-title', product.title);

        // Thêm badge hiển thị số lượng hình nếu có nhiều hơn 1 hình
        if (imageUrls.length > 1) {
            const badge = document.createElement('span');
            badge.className = 'image-count-badge';
            badge.textContent = `📷 ${imageUrls.length}`;
            tdImage.appendChild(badge);
        }

        // Click vào hình để mở gallery
        img.addEventListener('click', function() {
            const images = JSON.parse(this.getAttribute('data-images'));
            const title = this.getAttribute('data-product-title');
            openGallery(images, title);
        });

        // Thử các URL khác nếu URL đầu tiên bị lỗi
        let currentImageIndex = 0;
        img.onerror = function() {
            currentImageIndex++;
            if (currentImageIndex < imageUrls.length) {
                this.src = imageUrls[currentImageIndex];
            } else {
                // Sử dụng placeholder với tên sản phẩm
                this.src = defaultPlaceholder;
            }
        };
        tdImage.appendChild(img);

        const tdTitle = document.createElement('td');
        const strong = document.createElement('strong');

        // Highlight từ khóa tìm kiếm trong title
        if (searchTerm && searchTerm.trim() !== '') {
            strong.innerHTML = highlightText(product.title, searchTerm);
        } else {
            strong.textContent = product.title;
        }
        tdTitle.appendChild(strong);

        const tdPrice = document.createElement('td');
        tdPrice.className = 'price';
        tdPrice.textContent = `$${product.price}`;

        const tdCategory = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = 'category-badge';
        badge.textContent = product.category.name;
        tdCategory.appendChild(badge);

        // Thêm tất cả cells vào row
        row.appendChild(tdId);
        row.appendChild(tdImage);
        row.appendChild(tdTitle);
        row.appendChild(tdPrice);
        row.appendChild(tdCategory);

        tableBody.appendChild(row);
    });

    // Khởi tạo tooltip cho các dòng mới
    initializeTooltip();
}

// Hàm tìm kiếm sản phẩm theo title
function searchProducts(searchTerm) {
    const searchResult = document.getElementById('searchResult');
    const noResults = document.getElementById('noResults');
    const productTable = document.getElementById('productTable');
    const clearButton = document.getElementById('clearSearch');

    // Nếu không có từ khóa tìm kiếm, hiển thị tất cả
    if (!searchTerm || searchTerm.trim() === '') {
        filteredProducts = allProducts;
        searchResult.style.display = 'none';
        noResults.style.display = 'none';
        productTable.style.display = 'table';
        clearButton.classList.remove('show');
        displayStats(filteredProducts);
        currentPage = 1;
        renderPage();
        return;
    }

    // Lọc sản phẩm theo title (không phân biệt hoa thường)
    filteredProducts = allProducts.filter(product =>
        product.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Hiển thị kết quả tìm kiếm
    if (filteredProducts.length > 0) {
        searchResult.style.display = 'block';
        searchResult.textContent = `🔍 Tìm thấy ${filteredProducts.length} sản phẩm`;
        noResults.style.display = 'none';
        productTable.style.display = 'table';
        clearButton.classList.add('show');
        displayStats(filteredProducts);
        currentPage = 1;
        renderPage(searchTerm);
    } else {
        // Không tìm thấy sản phẩm nào
        searchResult.style.display = 'block';
        searchResult.textContent = `🔍 Tìm kiếm: "${searchTerm}"`;
        noResults.style.display = 'block';
        productTable.style.display = 'none';
        clearButton.classList.add('show');
        document.getElementById('paginationTop').style.display = 'none';
        document.getElementById('paginationBottom').style.display = 'none';
    }

    console.log(`🔍 Tìm kiếm "${searchTerm}": ${filteredProducts.length} kết quả`);
}

// Hàm highlight từ khóa tìm kiếm
function highlightText(text, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') return text;

    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// Khởi tạo tooltip cho description
function initializeTooltip() {
    const tooltip = document.getElementById('descriptionTooltip');
    const rows = document.querySelectorAll('#productTableBody tr');

    rows.forEach(row => {
        // Khi di chuột vào dòng
        row.addEventListener('mouseenter', function() {
            const description = this.getAttribute('data-description');
            if (description) {
                tooltip.textContent = description;
                tooltip.style.display = 'block';
            }
        });

        // Khi di chuyển chuột trong dòng
        row.addEventListener('mousemove', function(e) {
            const description = this.getAttribute('data-description');
            if (description) {
                // Đặt vị trí tooltip theo con trỏ chuột (dùng clientX/Y thay vì pageX/Y)
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top = (e.clientY + 15) + 'px';
            }
        });

        // Khi di chuột ra khỏi dòng
        row.addEventListener('mouseleave', function() {
            tooltip.style.display = 'none';
        });
    });
}

// Khởi tạo event listeners cho search
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearButton = document.getElementById('clearSearch');

    // Event onChange cho input
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value;
        searchProducts(searchTerm);
    });

    // Event cho nút Clear
    clearButton.addEventListener('click', () => {
        searchInput.value = '';
        searchProducts('');
    });

    // Event Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchProducts(searchInput.value);
        }
    });
}

// ==================== PAGINATION FUNCTIONS ====================

// Hàm tính tổng số trang
function getTotalPages() {
    return Math.ceil(filteredProducts.length / pageSize);
}

// Hàm render trang hiện tại
function renderPage(searchTerm = '') {
    const totalPages = getTotalPages();

    // Đảm bảo currentPage hợp lệ
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (totalPages === 0) currentPage = 1;

    // Tính toán sản phẩm hiển thị
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const productsToDisplay = filteredProducts.slice(startIndex, endIndex);

    // Hiển thị sản phẩm
    displayProducts(productsToDisplay, searchTerm);

    // Cập nhật UI phân trang
    updatePaginationUI();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Hàm cập nhật UI phân trang
function updatePaginationUI() {
    const totalPages = getTotalPages();

    // Cập nhật thông tin trang (cả top và bottom)
    ['Top', 'Bottom'].forEach(position => {
        document.getElementById(`currentPage${position}`).textContent = currentPage;
        document.getElementById(`totalPages${position}`).textContent = totalPages || 1;

        // Cập nhật trạng thái nút
        const firstBtn = document.getElementById(`firstPage${position}`);
        const prevBtn = document.getElementById(`prevPage${position}`);
        const nextBtn = document.getElementById(`nextPage${position}`);
        const lastBtn = document.getElementById(`lastPage${position}`);

        firstBtn.disabled = currentPage === 1;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage >= totalPages;
        lastBtn.disabled = currentPage >= totalPages;

        // Render số trang
        renderPageNumbers(position, totalPages);
    });
}

// Hàm render các số trang
function renderPageNumbers(position, totalPages) {
    const pageNumbersContainer = document.getElementById(`pageNumbers${position}`);
    pageNumbersContainer.innerHTML = '';

    // Hiển thị tối đa 5 số trang
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    // Điều chỉnh nếu gần cuối
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'pagination-btn';
        pageBtn.textContent = i;

        if (i === currentPage) {
            pageBtn.classList.add('active');
        }

        pageBtn.addEventListener('click', () => {
            currentPage = i;
            renderPage(document.getElementById('searchInput').value);
        });

        pageNumbersContainer.appendChild(pageBtn);
    }
}

// Hàm chuyển trang
function goToPage(page) {
    const totalPages = getTotalPages();
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    renderPage(document.getElementById('searchInput').value);
}

// Hàm thay đổi kích thước trang
function changePageSize(newSize) {
    pageSize = parseInt(newSize);
    currentPage = 1; // Reset về trang 1
    renderPage(document.getElementById('searchInput').value);

    // Đồng bộ cả 2 select box
    document.getElementById('pageSizeTop').value = newSize;
    document.getElementById('pageSizeBottom').value = newSize;
}

// Khởi tạo event listeners cho pagination
function initializePagination() {
    // Event cho page size selectors
    ['Top', 'Bottom'].forEach(position => {
        const selector = document.getElementById(`pageSize${position}`);
        selector.addEventListener('change', (e) => {
            changePageSize(e.target.value);
        });

        // Navigation buttons
        document.getElementById(`firstPage${position}`).addEventListener('click', () => {
            goToPage(1);
        });

        document.getElementById(`prevPage${position}`).addEventListener('click', () => {
            goToPage(currentPage - 1);
        });

        document.getElementById(`nextPage${position}`).addEventListener('click', () => {
            goToPage(currentPage + 1);
        });

        document.getElementById(`lastPage${position}`).addEventListener('click', () => {
            goToPage(getTotalPages());
        });
    });
}

// ==================== SORTING FUNCTIONS ====================

// Hàm sắp xếp sản phẩm
function sortProducts(field, order) {
    filteredProducts.sort((a, b) => {
        let valueA, valueB;

        if (field === 'price') {
            valueA = a.price;
            valueB = b.price;
        } else if (field === 'title') {
            valueA = a.title.toLowerCase();
            valueB = b.title.toLowerCase();
        }

        if (order === 'asc') {
            return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        } else {
            return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
        }
    });

    console.log(`📊 Sắp xếp theo ${field} ${order === 'asc' ? '↑' : '↓'}`);
}

// Khởi tạo event listeners cho sorting
function initializeSorting() {
    const sortableHeaders = document.querySelectorAll('.sortable');

    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const field = header.getAttribute('data-sort');

            // Xác định thứ tự sắp xếp
            let order = 'asc';
            if (currentSort.field === field) {
                if (currentSort.order === 'asc') {
                    order = 'desc';
                } else if (currentSort.order === 'desc') {
                    // Reset về không sắp xếp
                    currentSort = { field: null, order: null };
                    // Khôi phục dữ liệu gốc
                    const searchTerm = document.getElementById('searchInput').value;
                    if (searchTerm) {
                        filteredProducts = allProducts.filter(product =>
                            product.title.toLowerCase().includes(searchTerm.toLowerCase())
                        );
                    } else {
                        filteredProducts = [...allProducts];
                    }
                    updateSortIcons();
                    currentPage = 1;
                    renderPage(searchTerm);
                    return;
                }
            }

            // Cập nhật trạng thái sắp xếp
            currentSort = { field, order };

            // Thực hiện sắp xếp
            sortProducts(field, order);

            // Cập nhật UI
            updateSortIcons();

            // Render lại trang
            currentPage = 1;
            renderPage(document.getElementById('searchInput').value);
        });
    });
}

// Cập nhật icon sắp xếp
function updateSortIcons() {
    const sortableHeaders = document.querySelectorAll('.sortable');

    sortableHeaders.forEach(header => {
        const field = header.getAttribute('data-sort');
        header.classList.remove('asc', 'desc');

        if (currentSort.field === field) {
            header.classList.add(currentSort.order);
        }
    });
}

// ==================== PAGINATION FUNCTIONS ====================

// Hàm tính tổng số trang
function getTotalPages() {
    return Math.ceil(filteredProducts.length / pageSize);
}

// Hàm render trang hiện tại
function renderPage(searchTerm = '') {
    const totalPages = getTotalPages();

    // Đảm bảo currentPage hợp lệ
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
    if (totalPages === 0) currentPage = 1;

    // Tính toán sản phẩm hiển thị
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const productsToDisplay = filteredProducts.slice(startIndex, endIndex);

    // Hiển thị sản phẩm
    displayProducts(productsToDisplay, searchTerm);

    // Cập nhật UI phân trang
    updatePaginationUI();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Hàm cập nhật UI phân trang
function updatePaginationUI() {
    const totalPages = getTotalPages();

    // Cập nhật thông tin trang (cả top và bottom)
    ['Top', 'Bottom'].forEach(position => {
        document.getElementById(`currentPage${position}`).textContent = currentPage;
        document.getElementById(`totalPages${position}`).textContent = totalPages || 1;

        // Cập nhật trạng thái nút
        const firstBtn = document.getElementById(`firstPage${position}`);
        const prevBtn = document.getElementById(`prevPage${position}`);
        const nextBtn = document.getElementById(`nextPage${position}`);
        const lastBtn = document.getElementById(`lastPage${position}`);

        firstBtn.disabled = currentPage === 1;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage >= totalPages || totalPages === 0;
        lastBtn.disabled = currentPage >= totalPages || totalPages === 0;

        // Render số trang
        renderPageNumbers(position, totalPages);
    });
}

// Hàm render các số trang
function renderPageNumbers(position, totalPages) {
    const pageNumbersContainer = document.getElementById(`pageNumbers${position}`);
    pageNumbersContainer.innerHTML = '';

    if (totalPages === 0) return;

    // Hiển thị tối đa 5 số trang
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    // Điều chỉnh nếu gần cuối
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'pagination-btn';
        pageBtn.textContent = i;

        if (i === currentPage) {
            pageBtn.classList.add('active');
        }

        pageBtn.addEventListener('click', () => {
            currentPage = i;
            renderPage(document.getElementById('searchInput').value);
        });

        pageNumbersContainer.appendChild(pageBtn);
    }
}

// Hàm chuyển trang
function goToPage(page) {
    const totalPages = getTotalPages();
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    renderPage(document.getElementById('searchInput').value);
}

// Hàm thay đổi kích thước trang
function changePageSize(newSize) {
    pageSize = parseInt(newSize);
    currentPage = 1; // Reset về trang 1
    renderPage(document.getElementById('searchInput').value);

    // Đồng bộ cả 2 select box
    document.getElementById('pageSizeTop').value = newSize;
    document.getElementById('pageSizeBottom').value = newSize;
}

// ==================== GALLERY FUNCTIONS ====================

let currentGalleryImages = [];
let currentGalleryIndex = 0;

// Hàm mở gallery
function openGallery(images, title) {
    currentGalleryImages = images;
    currentGalleryIndex = 0;

    const gallery = document.getElementById('imageGallery');
    const overlay = document.getElementById('galleryOverlay');
    const galleryTitle = document.getElementById('galleryTitle');

    galleryTitle.textContent = title;

    // Hiển thị gallery
    gallery.classList.add('active');
    overlay.classList.add('active');

    // Hiển thị hình đầu tiên
    showGalleryImage(0);
}

// Hàm đóng gallery
function closeGallery() {
    const gallery = document.getElementById('imageGallery');
    const overlay = document.getElementById('galleryOverlay');

    gallery.classList.remove('active');
    overlay.classList.remove('active');
}

// Hàm hiển thị hình trong gallery
function showGalleryImage(index) {
    currentGalleryIndex = index;

    const galleryImage = document.getElementById('galleryImage');
    const counter = document.getElementById('galleryCounter');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    // Cập nhật hình ảnh
    galleryImage.src = currentGalleryImages[index];

    // Cập nhật counter
    counter.textContent = `${index + 1} / ${currentGalleryImages.length}`;

    // Disable/Enable buttons
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === currentGalleryImages.length - 1;
}

// Hàm chuyển sang hình trước
function prevGalleryImage() {
    if (currentGalleryIndex > 0) {
        showGalleryImage(currentGalleryIndex - 1);
    }
}

// Hàm chuyển sang hình sau
function nextGalleryImage() {
    if (currentGalleryIndex < currentGalleryImages.length - 1) {
        showGalleryImage(currentGalleryIndex + 1);
    }
}

// Khởi tạo gallery event listeners
function initializeGallery() {
    const closeBtn = document.getElementById('galleryClose');
    const overlay = document.getElementById('galleryOverlay');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    // Đóng gallery
    closeBtn.addEventListener('click', closeGallery);
    overlay.addEventListener('click', closeGallery);

    // Điều hướng
    prevBtn.addEventListener('click', prevGalleryImage);
    nextBtn.addEventListener('click', nextGalleryImage);

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        const gallery = document.getElementById('imageGallery');
        if (gallery.classList.contains('active')) {
            if (e.key === 'ArrowLeft') {
                prevGalleryImage();
            } else if (e.key === 'ArrowRight') {
                nextGalleryImage();
            } else if (e.key === 'Escape') {
                closeGallery();
            }
        }
    });
}

// Khởi tạo event listeners cho pagination
function initializePagination() {
    // Event cho page size selectors
    ['Top', 'Bottom'].forEach(position => {
        const selector = document.getElementById(`pageSize${position}`);
        selector.addEventListener('change', (e) => {
            changePageSize(e.target.value);
        });

        // Navigation buttons
        document.getElementById(`firstPage${position}`).addEventListener('click', () => {
            goToPage(1);
        });

        document.getElementById(`prevPage${position}`).addEventListener('click', () => {
            goToPage(currentPage - 1);
        });

        document.getElementById(`nextPage${position}`).addEventListener('click', () => {
            goToPage(currentPage + 1);
        });

        document.getElementById(`lastPage${position}`).addEventListener('click', () => {
            goToPage(getTotalPages());
        });
    });
}

// Gọi hàm getAll khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Đang khởi động Dashboard...');
    getAll();
});

// Export hàm để có thể sử dụng ở nơi khác (nếu cần)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getAll, searchProducts };
}
