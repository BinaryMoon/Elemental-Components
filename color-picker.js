class ColorPicker extends HTMLElement {

	// Declare elements as properties
	hueInput;
	saturationInput;
	lightnessInput;
	alphaInput;
	colorPreview;
	rgbaDisplay;
	tempCanvasCTX;


	/**
	 * Define observed attributes and custom properties
	 * @type {array}
	 */
	static observedAttributes = [ 'value' ];


	/**
	 * Create a new instance of the component.
	 *
	 * @return {void}
	 */
	constructor() {

		super();

		this._timeoutId = null;

		this._color = '#ffffff';

		// Shadow DOM.
		this.attachShadow( { mode: 'open' } );

		const rangeThumbStyle = `
			box-shadow: none;
			border: none;
			height: 1.5em;
			width: 1.5em;
			border-radius: 1em;
			background: white;
			cursor: pointer;
			-webkit-appearance: none;
		`;

		// HTML
		this.shadowRoot.innerHTML = `
			<style>
				#color-preview {
					border-radius: inherit;
					margin: inherit;
					font-family: inherit;
					height: inherit;
					transition: background 0.5s ease-in-out;
					overflow: hidden;
				}
				#controls {
					padding: 1.5em;
					display: flex;
					flex-direction: column;
					gap: 1em;
				}
				.rgba-display-wrapper {
					height: 100%;
					padding: 1.25em;
				}
				#rgba-display {
					font-family: "Courier New", monospace;
					font-size: 1em;
					font-weight: 900;
					padding: 0.25em;
					display: inline;
					border: none;
					border-radius: 0.2em;
					margin-bottom: 2.5em;
					letter-spacing: 0.1em;
					width: 8em;
					max-width: 100%;
					font-variant-numeric: tabular-nums;
				}
				input[type=range] {
					width: 100%;
					margin: 0;
					height: 1em;
					appearance: none;
					border-radius: 1em;
					border: 1px solid black;
				}
				input[type=range]::-webkit-slider-thumb {
					${rangeThumbStyle}
				}
				input[type="range"]::-moz-range-thumb {
					${rangeThumbStyle}
				}
				label {
					display: flex;
					align-items: center;
				}
				label abbr {
					width: 2em;
					font-weight: 900;
					line-height: 1;
				}
				.bg-cover {
					background: rgba(0,0,0,0.7);
					color: white;
				}
			</style>
			<div class="color-preview" id="color-preview">
				<div class="rgba-display-wrapper">
					<input type="text" id="rgba-display" class="bg-cover">
				</div>
				<div class="bg-cover" id="controls">
					<label for="hue">
						<abbr title="Hue: The color tint.">H</abbr>
						<input type="range" id="hue" min="0" max="360" value="0">
					</label>
					<label for="saturation">
						<abbr title="Saturation: The amount of gray in the color.">S</abbr>
						<input type="range" id="saturation" min="0" max="100" value="0">
					</label>
					<label for="lightness">
						<abbr title="Lightness: How light or dark the color is.">L</abbr>
						<input type="range" id="lightness" min="0" max="100" value="0">
					</label>
					<label for="alpha">
						<abbr title="Alpha: How transparent the color is.">A</abbr>
						<input type="range" id="alpha" min="0" max="1" step="0.01" value="1">
					</label>
				</div>
			</div>`;

		// Initialize elements.
		this.hueInput = this.shadowRoot.getElementById( 'hue' );
		this.saturationInput = this.shadowRoot.getElementById( 'saturation' );
		this.lightnessInput = this.shadowRoot.getElementById( 'lightness' );
		this.alphaInput = this.shadowRoot.getElementById( 'alpha' );
		this.colorPreview = this.shadowRoot.getElementById( 'color-preview' );
		this.rgbaDisplay = this.shadowRoot.getElementById( 'rgba-display' );

		// Create a temporary canvas to read color values.
		let tempCanvas = document.createElement( 'canvas' );
		tempCanvas.height = 1;
		tempCanvas.width = 1;
		this.tempCanvasCTX = tempCanvas.getContext( '2d', { willReadFrequently: true } );

	}


	/**
	 * Handle attribute changes
	 *
	 * @param {string} name The name of the attribute that changed.
	 * @param {string} oldValue The old value of the attribute.
	 * @param {string} newValue The new value of the attribute.
	 * @return {void}
	 */
	attributeChangedCallback( name, oldValue, newValue ) {

		if ( name === 'value' && oldValue !== newValue ) {
			this.setColor( newValue );
		}

	}


	/**
	 * Getter for the attribute value.
	 *
	 * @return {string}
	 */
	get value() {

		return this._color;

	}


	/**
	 * Setter for the attribute value.
	 *
	 * @param {string} value The value to set.
	 */
	set value( value ) {

		this.setAttribute( 'color', value );

	}


	/**
	 * Handle the component being added to the DOM.
	 *
	 * @return {void}
	 */
	connectedCallback() {

		this.setupEventListeners();

		const color = this.getAttribute( 'value' );
		if ( !color ) {
			this.setColor( 'green' );
		}

	}


	/**
	 * Setup event listeners.
	 *
	 * @return {void}
	 */
	setupEventListeners() {

		const inputs = this.shadowRoot.querySelectorAll( 'input[type="range"]' );
		inputs.forEach( input => input.addEventListener( 'input', () => this.maybeUpdateColor() ) );

	}


	/**
	 * Update the color after a short delay to prevent lag.
	 *
	 * @return {void}
	 */
	maybeUpdateColor() {

		clearTimeout( this._timeoutId );
		this._timeoutId = setTimeout(
			() => this.updateColor(),
			50
		);

	}


	/**
	 * Update the color and the relevant sliders and html.
	 *
	 * @return {void}
	 */
	updateColor() {

		const hue = Math.round( this.hueInput.value );
		const saturation = Math.round( this.saturationInput.value );
		const lightness = Math.round( this.lightnessInput.value );
		const alpha = parseFloat( this.alphaInput.value );
		const hsla = [ hue, saturation, lightness, alpha ];

		const rgba = this.HSLAToRGBA( hsla );

		const hexString = this.rgbToHexString( rgba );

		this._color = hexString;

		this.dispatchEvent(
			new CustomEvent(
				'change',
				{
					bubbles: true,
					detail: {
						hsla,
						rgba,
						hexString,
					}
				}
			)
		);

		// Display RGBA string
		this.rgbaDisplay.value = hexString;

		// Update color and gradients
		this.colorPreview.style.background = 'white';
		this.colorPreview.style.backgroundImage = `
			linear-gradient(to right, ${hexString}, ${hexString}),
			linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc),
			linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)
		`;
		this.colorPreview.style.backgroundSize = '100% 100%, 10px 10px, 10px 10px';
		this.colorPreview.style.backgroundPosition = '0 0, 0 0, 5px 5px';

		// Update the hue slider gradient
		this.hueInput.style.background = `linear-gradient(to right,
			hsl(0, ${saturation}%, ${lightness}%) 0%,
			hsl(60, ${saturation}%, ${lightness}%) 17%,
			hsl(120, ${saturation}%, ${lightness}%) 33%,
			hsl(180, ${saturation}%, ${lightness}%) 50%,
			hsl(240, ${saturation}%, ${lightness}%) 67%,
			hsl(300, ${saturation}%, ${lightness}%) 83%,
			hsl(360, ${saturation}%, ${lightness}%) 100%
		)`;

		// Update the saturation slider gradient
		this.saturationInput.style.background = `linear-gradient(to right,
			hsl(${hue}, 0%, ${lightness}%) 0%,
			hsl(${hue}, 100%, ${lightness}%) 100%
		)`;

		// Update the lightness slider gradient
		this.lightnessInput.style.background = `linear-gradient(to right,
			hsl(${hue}, ${saturation}%, 0%) 0%,
			hsl(${hue}, ${saturation}%, 50%) 50%,
			hsl(${hue}, ${saturation}%, 100%) 100%
		)`;

		// Update the alpha slider gradient.
		this.alphaInput.style.background = 'white';
		this.alphaInput.style.backgroundImage = `
			linear-gradient(to right, hsla(${hue}, ${saturation}%, ${lightness}%, 0), hsla(${hue}, ${saturation}%, ${lightness}%, 1)),
			linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc),
			linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)
		`;
		this.alphaInput.style.backgroundSize = '100% 100%, 10px 10px, 10px 10px';
		this.alphaInput.style.backgroundPosition = '0 0, 0 0, 5px 5px';

	}


	/**
	 * Set the color of the picker.
	 *
	 * @param {string} color The color to set. It can be any valid CSS color value.
	 * @return {void}
	 */
	setColor( color = 'hsla(60, 100%, 50%, 0.5)' ) {

		const rgba = this.colorToRGBA( color );
		const hsla = this.rgbToHSLA( rgba );

		const [ hue, saturation, lightness, alpha ] = hsla;

		// Set input values
		this.hueInput.value = hue;
		this.saturationInput.value = saturation;
		this.lightnessInput.value = lightness;
		this.alphaInput.value = alpha;

		this.updateColor();

	}


	/**
	 * Function to convert HSLA array to RGBA array.
	 *
	 * @param {array} hslaArray An array of HSLA values.
	 * @return {array} An array of RGBA values.
	 */
	HSLAToRGBA( hslaArray ) {

		const [ h, s, l, a ] = hslaArray;

		// Normalize HSL values
		const normalizedH = h % 360 / 360;
		const normalizedS = s / 100;
		const normalizedL = l / 100;

		// Helper function to convert hue to RGB
		function hueToRGB( p, q, t ) {
			if ( t < 0 ) t += 1;
			if ( t > 1 ) t -= 1;
			if ( t < 1 / 6 ) return p + ( q - p ) * 6 * t;
			if ( t < 1 / 2 ) return q;
			if ( t < 2 / 3 ) return p + ( q - p ) * ( 2 / 3 - t ) * 6;
			return p;
		}

		// Calculate RGB values
		let r, g, b;

		if ( normalizedS === 0 ) {
			// If saturation is 0, the color is a shade of gray
			r = g = b = normalizedL;
		} else {
			const q = normalizedL < 0.5 ? normalizedL * ( 1 + normalizedS ) : normalizedL + normalizedS - normalizedL * normalizedS;
			const p = 2 * normalizedL - q;

			r = hueToRGB( p, q, normalizedH + 1 / 3 );
			g = hueToRGB( p, q, normalizedH );
			b = hueToRGB( p, q, normalizedH - 1 / 3 );
		}

		// Convert RGB values to the range [0, 255]
		const rgbArray = [ Math.round( r * 255 ), Math.round( g * 255 ), Math.round( b * 255 ), isNaN( parseFloat( a ) ) ? 0 : parseFloat( a ) ];

		return rgbArray;

	}


	/**
	 * Convert a colour string, whatever it contains, to an RGBA value.
	 *
	 * @param {string} color The color to convert.
	 * @return {array}
	 */
	colorToRGBA( color ) {

		const ctx = this.tempCanvasCTX;

		// Clear canvas first.
		// This ensures transparent colours don't add to each other.
		ctx.clearRect( 0, 0, 1, 1 );

		// Draw color.
		ctx.fillStyle = color;
		ctx.fillRect( 0, 0, 1, 1 );

		// Read color.
		let rgba = Array.from( ctx.getImageData( 0, 0, 1, 1 ).data );

		// Convert alpha to range 0 -> 1
		rgba[ 3 ] = parseFloat( ( rgba[ 3 ] / 255 ).toFixed( 2 ) );

		return rgba;

	}


	/**
	 * Function to convert RGB array to hexa.
	 *
	 * @param {array} rgbArray An array of RGB values.
	 * @param {number} alpha The alpha value.
	 * @return {string} The hexa string.
	 */
	rgbToHexString( rgbArray, alpha = 1 ) {

		const [ r, g, b, a ] = rgbArray;
		return `#${r.toString( 16 ).padStart( 2, '0' )}${g.toString( 16 ).padStart( 2, '0' )}${b.toString( 16 ).padStart( 2, '0' )}${Math.round( a * 255 ).toString( 16 ).padStart( 2, '0' )}`;

	}


	/**
	 * Function to convert RGB array to hsla.
	 *
	 * @param {array} rgbArray An array of RGB values.
	 * @return {string} The hsla string.
	 */
	rgbToHSLString( rgbArray ) {

		const hsla = this.rgbToHSLA( rgbArray );
		return `hsla( ${hsla[ 0 ]}, ${hsla[ 1 ]} %, ${hsla[ 2 ]} %, ${hsla[ 3 ]} )`;

	}


	/**
	 * Function to convert RGB array to rgba.
	 *
	 * @param {array} rgbArray An array of RGB values.
	 * @return {string} The rgba string.
	 */
	rgbToRGBString( rgbArray ) {

		return `rgba( ${rgbArray.join( ',' )} )`;

	}


	/**
	 * Function to convert RGBA array to hsla.
	 *
	 * @param {array} rgbaArray An array of RGBA values.
	 * @return {array} An array of HSLA values.
	 */
	rgbToHSLA( rgbaArray ) {

		const [ r, g, b, a ] = rgbaArray;

		// Normalize RGBA values to the range [0, 1]
		const normalizedR = r / 255;
		const normalizedG = g / 255;
		const normalizedB = b / 255;

		// Find the maximum and minimum values among the normalized RGB components
		const max = Math.max( normalizedR, normalizedG, normalizedB );
		const min = Math.min( normalizedR, normalizedG, normalizedB );

		// Calculate lightness
		const lightness = ( max + min ) / 2;

		// Calculate saturation
		let saturation = 0;
		if ( max !== min ) {
			saturation = ( max - min ) / ( 1 - Math.abs( 2 * lightness - 1 ) );
		}

		// Calculate hue
		let hue = 0;
		if ( max === normalizedR ) {
			hue = ( ( normalizedG - normalizedB ) / ( max - min ) ) % 6;
		} else if ( max === normalizedG ) {
			hue = ( ( normalizedB - normalizedR ) / ( max - min ) + 2 );
		} else {
			hue = ( ( normalizedR - normalizedG ) / ( max - min ) + 4 );
		}

		// Convert hue to degrees
		hue *= 60;

		if ( hue < 0 ) {
			hue += 360;
		}

		return [ Math.round( hue ), Math.round( saturation * 100 ), Math.round( lightness * 100 ), a ];

	}

}

customElements.define( 'color-picker', ColorPicker );
