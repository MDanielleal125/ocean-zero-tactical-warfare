export function showElement(element) {
    if (!element) return;
    element.style.display = '';
    element.classList.remove('hidden');
}

export function clearClassesFromAll(selector, classes) {
    const nodes = document.querySelectorAll(selector);
    if (!nodes.length) return;

    nodes.forEach(node => {
        classes.forEach(cls => node.classList.remove(cls));
    });
}
