import twemoji from 'twemoji';

/**
 * Svelte action that parses emojis in an element using Twemoji (Apple-style SVGs)
 */
export function parseEmojis(node: HTMLElement) {
	function parse() {
		twemoji.parse(node, {
			folder: 'svg',
			ext: '.svg'
		});

		// Style the emoji images
		const images = node.querySelectorAll('img.emoji');
		images.forEach(img => {
			(img as HTMLImageElement).style.width = '1.2em';
			(img as HTMLImageElement).style.height = '1.2em';
			(img as HTMLImageElement).style.display = 'inline-block';
			(img as HTMLImageElement).style.verticalAlign = 'middle';
			(img as HTMLImageElement).style.margin = '0 1px';
		});
	}

	parse();

	// Re-parse when content changes
	const observer = new MutationObserver(parse);
	observer.observe(node, { childList: true, subtree: true, characterData: true });

	return {
		destroy() {
			observer.disconnect();
		}
	};
}
