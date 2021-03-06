import { ShortAnswerQuestion } from '../short-answer-question';
import { BaseEntity } from 'app/shared';

export class ShortAnswerSolution implements BaseEntity {
    public id: number;
    public text: string;
    public invalid = false; // default value
    public question: ShortAnswerQuestion;

    // additionally added after database changes with Stephan for visual mode
    public posX: number;
    public posY: number;
    public tempID: number;

    constructor() {}
}
