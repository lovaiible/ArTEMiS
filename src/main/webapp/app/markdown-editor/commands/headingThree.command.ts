import { Heading } from 'app/markdown-editor/commands/heading.command';

export class HeadingThreeCommand extends Heading {

    buttonIcon = 'heading3';
    buttonTranslationString = 'arTeMiSApp.multipleChoiceQuestion.editor.headingThree';

    execute(): void {
        if (!this.editor) { return; }
        let selectedText = this.editor.getSelectedText();
        const isSelected = !!selectedText;
        const startSize = 2;
        let initText = '';
        const range = this.editor.selection.getRange();
        selectedText = `### ${selectedText || initText}`;
        this.editor.session.replace(range, selectedText);
        if (!isSelected) {
            range.start.column += startSize;
            range.end.column = range.start.column + initText.length;
            this.editor.selection.setRange(range);
        }
        this.editor.focus();

    }
}
