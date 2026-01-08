class ProductForm extends HTMLElement {
    constructor() {
        super();
        this.form = this.querySelector('form');
        this.addToCartButton = this.querySelector('.add-to-cart');
        this.current_variant_id = this.getAttribute('variant-id');
        this.productHandle = this.getAttribute('product-handle');

        this.variants = JSON.parse(this.querySelector('#product-variants-json').innerText); // <- Make sure to include a script tag with id="product-variants-json" in your HTML that contains the variants data in JSON format.
        this.currentVariant = this.variants.find(variant => variant.id == this.getAttribute('variant-id'));
    }

    connectedCallback() {
        this.addEventListener('submit', this.handleFormSubmit.bind(this));
        this.addEventListener('input', this.updateVariant.bind(this));

        // If JavaScript is working, hide the variant select dropdown and show the radios instead
        if (this.querySelector('#main-variant-select')) this.querySelector('#main-variant-select').style.display = 'none'; 
        if (this.querySelector('.product-variant-options')) this.querySelector('.product-variant-options').style.display = 'block';
    }

    disconnectedCallback() {
        this.removeEventListener('submit', this.handleFormSubmit.bind(this));
        this.removeEventListener('input', this.updateVariant.bind(this));
    }

    // variantFromOptionValues() {
    //     const option1 = this.querySelector('select[name="option1"]')?.value || null;
    //     const option2 = this.querySelector('select[name="option2"]')?.value || null;
    //     const option3 = this.querySelector('select[name="option3"]')?.value || null;

    //     return this.variants.find(variant => 
    //         variant.option1 == option1 &&
    //         variant.option2 == option2 &&
    //         variant.option3 == option3
    //     );
    // }

    // setSelectedOptionsFromVariant() {
    //     if(this.currentVariant) {
    //         if(this.querySelector('select[name="option1"]') && this.currentVariant.option1) this.querySelector('select[name="option1"]').value = this.currentVariant.option1;
    //         if(this.querySelector('select[name="option2"]') && this.currentVariant.option2) this.querySelector('select[name="option2"]').value = this.currentVariant.option2;
    //         if(this.querySelector('select[name="option3"]') && this.currentVariant.option3) this.querySelector('select[name="option3"]').value = this.currentVariant.option3;
    //     }
    // }

    updateVariant() {
        this.currentVariant = this.variants.find(variant => variant.id == this.querySelector('[name="id"]:checked').value);

        // 1. Update history state
        window.history.replaceState({}, '', `/products/${this.productHandle}?variant=${this.currentVariant.id}`);

        // 2. Update image
        document.querySelector('.product-image ' ).src = this.currentVariant.featured_image.src+'&width=400';

        // 3. Update price
        document.querySelector('.product-price').innerText = Shopify.formatMoney(this.currentVariant.price);

        // 4. Update button state
        const inputButton = this.querySelector('button[type="submit"]');
        if(!this.currentVariant.available) {
            inputButton.setAttribute('disabled', '');
            inputButton.value = 'SOLD OUT';
        } else {
            if(inputButton.hasAttribute('disabled')) inputButton.removeAttribute('disabled');
            inputButton.value = 'Add to cart';
        }
    }

    async handleFormSubmit(evt) {
        evt.preventDefault();
        const addToCartButton = this.querySelector('.add-to-cart');
        
        try {
            // Disable button and show loading state
            addToCartButton.disabled = true;
            addToCartButton.textContent = 'Adding...';
            
            const formData = new FormData(this.form); 
            const response = await fetch(window.Shopify.routes.root + 'cart/add.js', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Failed to add item to cart');
            }
            
            const jsonResponse = await response.json();
            
            // Get the side cart element
            const sideCart = document.querySelector('side-cart');
            
            if (sideCart && typeof sideCart.addLineItem === 'function') {
                // Add the item to the side cart
                sideCart.addLineItem(jsonResponse);
                
                // Show the side cart
                const sideCartDrawer = sideCart.closest('sidebar-drawer');
                if (sideCartDrawer && typeof sideCartDrawer.open === 'function') {
                    sideCartDrawer.open();
                }
            } else {
                // Fallback: Refresh the cart if side cart is not available
                sideCart?.getCart?.();
            }
            
            // Show success message
            this.showSuccessMessage('Item added to cart!');
            
        } catch (error) {
            console.error('Error adding to cart:', error);
            alert('Error adding item to cart. Please try again.');
        } finally {
            // Reset button state
            if (addToCartButton) {
                addToCartButton.disabled = false;
                addToCartButton.textContent = 'Add to Cart';
            }
        }
    }
    
    showSuccessMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'product-form__message';
        messageElement.textContent = message;
        this.appendChild(messageElement);
        
        setTimeout(() => {
            if (this.contains(messageElement)) {
                this.removeChild(messageElement);
            }
        }, 3000);
    }
}

customElements.define('product-form', ProductForm);