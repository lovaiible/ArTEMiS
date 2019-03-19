import { Command } from 'app/markdown-editor/commands/command';

export class HeadingTwoCommand extends Command {

    buttonIcon = 'heading2';
    buttonTranslationString = 'arTeMiSApp.multipleChoiceQuestion.editor.headingTwo';

    execute(): void {
        let selectedText = this.editor.getSelectedText();
        let textToAdd = '';

        if (selectedText.includes('##')) {
            textToAdd = selectedText.slice(2);
            this.editor.insert(textToAdd);
        } else {
            const initText = 'Heading Two';
            const range = this.editor.selection.getRange();
            selectedText = `## ${selectedText || initText}`;
            this.editor.session.replace(range, selectedText);
            this.editor.focus();
        }
    }
}