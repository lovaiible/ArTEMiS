import * as $ from 'jquery';
import { ActivatedRoute } from '@angular/router';
import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Interactable } from 'interactjs';
import { JhiAlertService } from 'ng-jhipster';
import { LocalStorageService } from 'ngx-webstorage';
import { Subscription } from 'rxjs/Subscription';
import {
    compose,
    fromPairs,
    map,
    toPairs,
} from 'lodash/fp';

import { BuildLogEntryArray } from 'app/entities/build-log';

import { CourseService } from '../entities/course';
import { Participation, ParticipationService } from '../entities/participation';
import { ParticipationDataProvider } from '../course-list/exercise-list/participation-data-provider';
import { RepositoryFileService, RepositoryService } from '../entities/repository/repository.service';
import { Result } from '../entities/result';
import { SaveStatusChange, Session, AnnotationArray } from '../entities/ace-editor';
import { WindowRef } from '../core/websocket/window.service';

@Component({
    selector: 'jhi-editor',
    templateUrl: './code-editor.component.html',
    providers: [JhiAlertService, WindowRef, CourseService, RepositoryFileService]
})
export class CodeEditorComponent implements OnInit, OnChanges, OnDestroy {
    /** Dependencies as defined by the Editor component */
    participation: Participation;
    repository: RepositoryService;
    selectedFile: string;
    paramSub: Subscription;
    repositoryFiles: string[];
    session: Session;
    latestResult: Result;
    buildLogErrors: { errors: { [fileName: string]: AnnotationArray }; timestamp: number };
    saveStatusLabel: string;
    saveStatusIcon: { spin: boolean; icon: string; class: string };

    /** File Status Booleans **/
    isSaved = true;
    isBuilding = false;
    isCommitted: boolean;

    /**
     * @constructor CodeEditorComponent
     * @param {ActivatedRoute} route
     * @param {WindowRef} $window
     * @param {ParticipationService} participationService
     * @param {ParticipationDataProvider} participationDataProvider
     * @param {RepositoryService} repositoryService
     * @param {RepositoryFileService} repositoryFileService
     */
    constructor(
        private route: ActivatedRoute,
        private $window: WindowRef,
        private participationService: ParticipationService,
        private participationDataProvider: ParticipationDataProvider,
        private repositoryService: RepositoryService,
        private repositoryFileService: RepositoryFileService,
        private localStorageService: LocalStorageService
    ) {}

    /**
     * @function ngOnInit
     * @desc Fetches the participation and the repository files for the provided participationId in params
     * If we are able to find the participation with the id specified in the route params in our data storage,
     * we use it in order to spare any additional REST calls
     */
    ngOnInit(): void {
        /** Assign repository */
        this.repository = this.repositoryService;

        this.paramSub = this.route.params.subscribe(params => {
            // Cast params id to Number or strict comparison will lead to result false (due to differing types)
            if (
                this.participationDataProvider.participationStorage &&
                this.participationDataProvider.participationStorage.id === Number(params['participationId'])
            ) {
                // We found a matching participation in the data provider, so we can avoid doing a REST call
                this.participation = this.participationDataProvider.participationStorage;
                this.obtainLatestResult();
            } else {
                /** Query the participationService for the participationId given by the params */
                this.participationService
                    .findWithLatestResult(params['participationId'])
                    .subscribe((response: HttpResponse<Participation>) => {
                        this.participation = response.body;
                        this.obtainLatestResult();
                    });
            }
            /** Query the repositoryFileService for files in the repository */
            this.repositoryFileService.query(params['participationId']).subscribe(
                files => {
                    // do not display the README.md, because students should not edit it
                    this.repositoryFiles = files.filter(value => value !== 'README.md');
                    this.checkIfRepositoryIsClean();
                    this.loadSession();
                },
                (error: HttpErrorResponse) => {
                    console.log('There was an error while getting files: ' + error.message + ': ' + error.error);
                }
            );
        });

        /** Assign repository */
        this.repository = this.repositoryService;
    }

    obtainLatestResult() {
        if (this.participation.results && this.participation.results.length > 0) {
            this.latestResult = this.participation.results[0];
        }
    }

    /**
     * @function ngOnChanges
     * @desc Checks if the repository has uncommitted changes
     * @param changes
     */
    ngOnChanges(changes: SimpleChanges) {
        this.checkIfRepositoryIsClean();
    }

    /**
     * @function checkIfRepositoryIsClean
     * @desc Calls the repository service to see if the repository has uncommitted changes
     */
    checkIfRepositoryIsClean(): void {
        this.repository.isClean(this.participation.id).subscribe(res => {
            this.isCommitted = res.isClean;
        });
    }

    /**
     * @function updateSaveStatusLabel
     * @desc Callback function for a save status changes of files
     * @param $event Event object which contains information regarding the save status of files
     */
    updateSaveStatusLabel($event: SaveStatusChange) {
        this.isSaved = $event.isSaved;
        if (!this.isSaved) {
            this.isCommitted = false;
        }
        this.saveStatusLabel = $event.saveStatusLabel;
        this.saveStatusIcon = $event.saveStatusIcon;
    }

    /**
     * @function updateLatestResult
     * @desc Callback function for when a new result is received from the result component
     * @param $event Event object which contains the newly received result
     */
    updateLatestResult($event: any) {
        this.isBuilding = false;
        this.latestResult = $event.newResult;
    }

    /**
     * Check if the received build logs are recent and format them for use in the ace-editor
     * @param buildLogs
     */
    updateLatestBuildLogs(buildLogs: BuildLogEntryArray) {
        const timestamp = buildLogs.length ? Date.parse(buildLogs[0].time) : 0;
        if (!this.buildLogErrors || timestamp > this.buildLogErrors.timestamp) {
            this.buildLogErrors = { errors: buildLogs.extractErrors(), timestamp };
        }
    }

    /**
     * @function updateSelectedFile
     * @desc Callback function for when a new file is selected within the file-browser component
     * @param $event Event object which contains the new file name
     */
    updateSelectedFile($event: any) {
        this.selectedFile = $event.fileName;
    }

    /**
     * @function updateRepositoryCommitStatus
     * @desc Callback function for when a file was created or deleted; updates the current repository files
     */
    updateRepositoryCommitStatus($event: any) {
        this.isSaved = false;
        this.isCommitted = false;
        /** Query the repositoryFileService for updated files in the repository */
        this.repositoryFileService.query(this.participation.id).subscribe(
            files => {
                // do not display the README.md, because students should not edit it
                this.repositoryFiles = files.filter(value => value !== 'README.md');
                // Select newly created file
                if ($event.mode === 'create') {
                    this.selectedFile = $event.file;
                }
            },
            (error: HttpErrorResponse) => {
                console.log('There was an error while getting files: ' + error.message + ': ' + error.error);
            }
        );
    }

    /**
     * @function loadSession
     * @desc Gets the user's session data from localStorage to load editor settings
     */
    loadSession() {
        // Only do this if we already received a participation object from parent
        if (this.participation) {
            const sessions = JSON.parse(this.localStorageService.retrieve('sessions') || '{}');
            this.session = sessions[this.participation.id];
            if (this.session && (!this.buildLogErrors || this.session.timestamp > this.buildLogErrors.timestamp)) {
                this.buildLogErrors = {
                    errors: compose(
                        fromPairs,
                        map(([fileName, errors]) => [fileName, new AnnotationArray(...errors)]),
                        toPairs
                    )(this.session.errors),
                    timestamp: this.session.timestamp
                };
            }
        }
    }

    /**
     * @function toggleCollapse
     * @desc Collapse parts of the editor (file browser, build output...)
     * @param $event {object} Click event object; contains target information
     * @param horizontal {boolean} Used to decide which height to use for the collapsed element
     * @param interactResizable {Interactable} The interactjs element, used to en-/disable resizing
     * @param minWidth {number} Width to set the element to after toggling the collapse
     * @param minHeight {number} Height to set the element to after toggling the collapse
     */
    toggleCollapse($event: any, horizontal: boolean, interactResizable: Interactable, minWidth?: number, minHeight?: number) {
        const target = $event.toElement || $event.relatedTarget || $event.target;
        target.blur();
        const $card = $(target).closest('.card');

        if ($card.hasClass('collapsed')) {
            $card.removeClass('collapsed');
            interactResizable.resizable({ enabled: true });

            // Reset min width if argument was provided
            if (minWidth) {
                $card.width(minWidth + 'px');
            }
            // Reset min height if argument was provided
            if (minHeight) {
                $card.height(minHeight + 'px');
            }
        } else {
            $card.addClass('collapsed');
            horizontal ? $card.height('35px') : $card.width('55px');
            interactResizable.resizable({ enabled: false });
        }
    }

    /**
     * @function commit
     * @desc Commits the current repository files
     * @param $event
     */
    commit($event: any) {
        const target = $event.toElement || $event.relatedTarget || $event.target;
        target.blur();
        this.isBuilding = true;
        this.repository.commit(this.participation.id).subscribe(
            () => {
                this.isCommitted = true;
            },
            err => {
                console.log('Error during commit ocurred!', err);
            }
        );
    }

    /**
     * @function ngOnDestroy
     * @desc Framework function which is executed when the component is destroyed.
     * Used for component cleanup, close open sockets, connections, subscriptions...
     */
    ngOnDestroy() {
        /** Unsubscribe onDestroy to avoid performance issues due to a high number of open subscriptions */
        this.paramSub.unsubscribe();
    }
}
