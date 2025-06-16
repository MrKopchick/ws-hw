import { createElement } from "../helpers/dom-helper.mjs";

const showInputModal = ({ title, onChange = () => {}, onSubmit = () => {} }) => {
    const rootElement = document.querySelector("#root");

    const modalElement = createModalElement(title);

    const submitButton = createElement({
        tagName: "button",
        className: "submit-btn",
        innerElements: ["Submit"]
    });
    const inputElement = createElement({
        tagName: "input",
        className: "modal-input"
    });

    modalElement.append(getFooter([inputElement, submitButton]));
    rootElement.append(modalElement);

    submitButton.addEventListener("click", () => {
        modalElement.remove();
        onSubmit(inputElement.value);
    });
    inputElement.addEventListener("change", (e) => onChange(e.target.value));
};

const showResultsModal = ({ usersSortedArray, onClose = () => {} }) => {
    const rootElement = document.querySelector("#root");

    const modalElement = createModalElement("Results: ");

    const resultElements = usersSortedArray.map((user, index) => {
        const place = index + 1;
        let placeSymbol;

        if (user.finished) {
            placeSymbol = place <= 3 ? ["🥇", "🥈", "🥉"][place - 1] : `${place})`;
        } else {
            placeSymbol = "🚩";
        }

        return createElement({
            tagName: "div",
            className: `user-result ${user.isCurrentUser ? "current-user" : ""} ${user.finished ? "" : "dnf"}`,
            innerElements: [
                `${placeSymbol} ${user.username}`,
                createElement({
                    tagName: "span",
                    className: "user-time",
                    innerElements: [user.time]
                })
            ]
        });
    });

    const bodyWrapper = createElement({
        tagName: "div",
        className: "body-wrapper",
        innerElements: resultElements
    });

    const closeButton = createElement({
        tagName: "button",
        className: "submit-btn",
        attributes: { id: "quit-results-btn" },
        innerElements: ["Close"]
    });

    modalElement.append(bodyWrapper);
    modalElement.append(getFooter([closeButton]));
    rootElement.append(modalElement);

    closeButton.addEventListener("click", () => {
        modalElement.remove();
        onClose();
    });
};

const showMessageModal = ({ message, onClose = () => {} }) => {
    const rootElement = document.querySelector("#root");

    const modalElement = createModalElement(message);

    const closeButton = createElement({
        tagName: "button",
        className: "submit-btn",
        innerElements: ["Close"]
    });

    modalElement.append(getFooter([closeButton]));
    rootElement.append(modalElement);

    closeButton.addEventListener("click", () => {
        modalElement.remove();
        onClose();
    });
};

const createModalElement = (title) => {
    const titleElement = createElement({
        tagName: "h1",
        className: "title",
        innerElements: [title]
    });

    const modal = createElement({
        tagName: "div",
        className: "modal",
        innerElements: [titleElement]
    });

    return modal;
};

const getFooter = (children) => {
    return createElement({
        tagName: "div",
        className: "inputs-wrapper",
        innerElements: children
    });
};

export { showInputModal, showResultsModal, showMessageModal };
