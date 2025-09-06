import { Component,ElementRef,HostListener,OnDestroy,OnInit, ViewChild  } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { map } from "rxjs/operators";
import { environment } from 'src/environments/environment';
import { Participant, VideoSDK } from "@videosdk.live/js-sdk";
import { APIService } from "src/app/services/API/api.service";
import { MessageObject, ParticipantObject } from "src/app/shared/MockData/selfstudy/model/models";
import { MeetpopComponent } from "../student/student-modals/meetpop/meetpop.component";
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from "sweetalert2";
import { Router } from '@angular/router';



@Component({
  selector: 'app-quanhub',
  templateUrl: './quanhub.component.html',
  styleUrls: ['./quanhub.component.css'],
})
export class QuanhubComponent implements OnInit, OnDestroy{
  isFullScreen: boolean = false;
  showParticipants: boolean = false;
  private isOriginalOrientation: boolean = true;
  isWhiteboardOpen: boolean = false;
  whiteboard: any;
  isChatModalOpen = false;
  @ViewChild('videoContainer')
  videoContainer!: ElementRef;
  constructor(
    private http: HttpClient,
    private API: APIService,
    private modalService: NgbModal,
    private router: Router


  ) {

  }


    changeOrientation() {
      try {
        const orientation = screen.orientation as any;  // TypeScript casting

        if (orientation.lock) {
          if (this.isOriginalOrientation) {
            orientation.lock('landscape');  // Lock to landscape
          } else {
            orientation.lock('portrait');   // Lock to portrait
          }
          this.isOriginalOrientation = !this.isOriginalOrientation;
        } else {
          console.warn('Screen Orientation API not supported');
        }
      } catch (error) {
        console.error('Error changing orientation:', error);
      }
    }



  toggleModal() {
    this.isChatModalOpen = !this.isChatModalOpen;
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    // Check if the Enter key is pressed and the input field is focused
    if (event.key === 'Enter' && document.activeElement === this.messageInput?.nativeElement) {
      this.sendMessage();  // Call the sendMessage function
      event.preventDefault();  // Prevent default behavior like submitting forms
    }
  }

  @HostListener('document:fullscreenchange', ['$event'])
  onFullScreenChange() {
    this.isFullScreen = !!document.fullscreenElement;
  }

  toggleParticipants() {
    this.showParticipants = !this.showParticipants;
  }

  toggleFullScreen() {
    const elem = this.videoContainer.nativeElement;

    if (!document.fullscreenElement) {
        if (elem.requestFullscreen) {
            elem.requestFullscreen().then(() => {
                this.isFullScreen = true;
            });
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().then(() => {
                this.isFullScreen = false;
            });
        }
    }
}

meetingInfo:any;

  meetSettings(){
    const modalRef = this.modalService.open(MeetpopComponent);
    modalRef.closed.subscribe(data=>{
      if(data != null){
          this.isWebCamOn = this.API.joinWithCamera!;
          this.isMicOn = this.API.joinWithMic!;
          // this.meetingHeader = this.API.meetingInfo.course;
          this.meetingInfo  = this.API.meetingInfo;
          this.startClass();
      }
    })
  }

  ngOnDestroy(): void {
    if(this.meeting == null){
      return;
    }
    this.meeting?.leave();
    this.API.resetMeetOptions();

    if (this.meetingID) {
      this.logMeetingActivity('left');
    }
  }
  items: any[] = [
    { imageUrl: 'assets/ken.jpg', alt: 'Ken' },
    { imageUrl: 'assets/cleo.jpg', alt: 'Cleo' },
    { imageUrl: 'assets/juswa.jpg', alt: 'Juswa' },
    { imageUrl: 'assets/tonzxz.jpg', alt: 'Tonzxz' },
    { imageUrl: 'assets/cleo.jpg', alt: 'Cleo' },
    { imageUrl: 'assets/tonzxz.jpg', alt: 'Tonzxz' },
  ];

  currentPosition = 0;

  moveLeft() {
    if (this.currentPosition > 0) {
      this.currentPosition--;
    }
  }

  moveRight() {
    // Assuming each row has 5 columns
    const maxPosition = this.items.length - 5;
    if (this.currentPosition < maxPosition) {
      this.currentPosition++;
    }
  }

  shouldDisplay(index: number): boolean {
    return index >= this.currentPosition && index < this.currentPosition + 5;
  }

  /* ---------- GMEET --------------*/

  meetingHeader:string = '';
  teacherName:string = '';
  meetingID:string = '';
  meeting:any;
  participantName:string = '';
  particpantID?:string;
  mainSrc?:ParticipantObject;
  shareSrc?:ParticipantObject
  message:string = '';
  notifTime:number = 2000;
  participants: Map<string, ParticipantObject> = new Map();
  participantsAudio: Map<string, ParticipantObject> = new Map();
  activeParticipants:Map<string, ParticipantObject> = new Map();
  participantType?:string;
  participantSize:number = 0;
  largestParticipantSize:number = 1;
  profile?:string;

  meNotifDisplayed = false;
  localParticipant: any;
  showScreen:number = 0;
  isWebCamOn:boolean = true;
  isMicOn:boolean = true;
  isSharingScreen:boolean = false;
  messages:Array<MessageObject> = [];
  webCamLoading:boolean = false;
  shareScreenLoading:boolean = false;
  sessionID:string = this.API.createID32();

  participantSharing:any = {
    id:'none',
    name: 'Participant'
  };

  @ViewChild('messageInput') messageInput?: ElementRef;

  private recentlyLoggedActivities = new Map<string, number>();


  ngOnInit(): void {
    const user = this.API.getUserData();
    this.participantName = user.firstname + ' ' + user.lastname;
    this.particpantID = user.id;
    this.profile = user.profile;
    this.participantType = this.API.getUserType();

    console.log('User data:', {
      id: user.id,
      name: this.participantName,
      type: this.participantType,
      userType: this.API.getUserType()
    });

    if(this.API.getUserType()=='1'){
      this.teacherName = this.participantName;
      this.API.endMeeting(this.particpantID!).subscribe();
      if(this.API.joinWithCamera != undefined && this.API.joinWithCamera != null){
        this.isWebCamOn = this.API.joinWithCamera;
        this.isMicOn = this.API.joinWithMic!;
        this.API.resetMeetOptions();
        this.startClass();
      }
    }
    
  }

  private logMeetingActivity(action: string): void {
    const userData = this.API.getUserData();
    const userType = this.API.getUserType();
    
    if (!userData) {
      console.error('No user data available for logging');
      return;
    }

    if (this.participantType === '0') { // Student
      console.log('Logging student activity:', action);
      
      if (!this.meetingID) {
        console.error('No meeting ID available for student attendance logging');
        return;
      }
      
      // For students, save to speech_attendance table
      this.saveStudentToSpeechAttendance(userData.id, action);
    } else if (this.participantType === '1') { // Teacher
      console.log('Logging teacher activity:', action);
      
      if (this.meetingID && action === 'started_class') {
        // For teachers starting a class, save to lab_meetings
        this.saveTeacherMeetingToDatabase(userData.id, this.meetingID);
      } else if (action === 'ended_meeting') {
        // Log when teacher ends meeting
        this.logActivityToSystem(userData.id, 'ended_meeting', `Teacher ended meeting: ${this.meetingID}`);
      } else {
        console.log(`Teacher ${action} meeting logged`);
      }
    }
  
    // Log specific meeting activities for both teachers and students
    if (action === 'joined_meeting') {
      this.logActivityToSystem(userData.id, 'joined_meeting', `User joined meeting: ${this.meetingID}`);
    } else if (action === 'left_meeting') {
      this.logActivityToSystem(userData.id, 'left_meeting', `User left meeting: ${this.meetingID}`);
    }
  }
  
  // New method to log activities to your system
  private logActivityToSystem(userId: string, activityType: string, description: string): void {
    const activityData = {
      user_id: userId,
      user_type: this.API.getUserType() === '1' ? 'teacher' : 'student',
      activity_type: activityType,
      description: description,
      timestamp: new Date().toISOString(),
      meeting_id: this.meetingID,
      ip_address: 'N/A',
      user_agent: navigator.userAgent
    };
    
    console.log('Activity logged:', activityData);
    
    // Save this activity to your database so it appears in the dashboard
    this.saveActivityToDatabase(activityData);
  }
  
  private saveActivityToDatabase(activityData: any): void {
    // Since save_activity doesn't exist, let's use your existing working methods
    
    if (activityData.user_type === 'student') {
      // For students, try to save to speech_attendance table
      this.API.recordSpeechLabAttendance(activityData.user_id).then((response: any) => {
        if (response && response.success) {
          console.log('Student activity saved via speech_attendance');
        } else {
          console.log('Student activity logged to console (speech_attendance failed)');
        }
      }).catch((error: any) => {
        console.log('Student activity logged to console (speech_attendance error)');
      });
    } else {
      // For teachers, log to console for now
      console.log('Teacher activity logged to console:', activityData);
      
      // Option: Save to your existing meetings table
      this.saveTeacherActivityToMeetings(activityData);
    }
  }

  private saveTeacherActivityToMeetings(activityData: any): void {
    // Use your existing working API method
    this.API.post('create_entry', {
      method: 'update_meeting_activity',
      body: {
        meeting_id: activityData.meeting_id,
        activity_type: activityData.activity_type,
        description: activityData.description,
        timestamp: activityData.timestamp
      }
    }).subscribe({
      next: (response) => {
        console.log('Teacher activity saved to meetings table:', response);
      },
      error: (error) => {
        console.error('Failed to save teacher activity to meetings table:', error);
      }
    });
  }

  private saveTeacherMeetingToDatabase(teacherId: string, meetingId: string): void {
    // Use the existing working method instead of saveTeacherMeeting
    const meetingData = {
      sessionID: this.sessionID,
      participantID: teacherId,
      meetingID: meetingId
    };
  
    console.log('Using existing startMeeting method for logging:', meetingData);
    
    // This method already works and creates the meeting
    this.API.startMeeting(this.sessionID, teacherId, meetingId);
    
    // The meeting is already being created by startMeeting, so we just log success
    console.log('Teacher meeting logged via startMeeting method');
    console.log(`Teacher ${teacherId} started meeting ${meetingId} - logged successfully`);
  }
  
  private saveMeetingWithLabId(teacherId: string, meetingId: string, labId: number): void {
    const meetingData = {
      id: meetingId,
      labid: labId,
      teacherid: teacherId,
      meetingcode: meetingId,
      participants: 1,
      starttime: new Date().toISOString()
    };
  
    console.log('Saving teacher meeting to database:', meetingData);
    
    this.API.saveTeacherMeeting(meetingData).subscribe({
      next: (response: any) => {
        console.log('Full saveTeacherMeeting response:', response);
        if (response && response.success) {
          console.log('Teacher meeting saved to lab_meetings table');
        } else {
          console.error('Failed to save teacher meeting:', response);
        }
      },
      error: (error: any) => {
        console.error('Error saving teacher meeting:', error);
      }
    });
  }


  texthandler(event: any) {
    this.message = event.target.value;
  }

  clearInput(){
    this.messageInput!.nativeElement.value = '';
    this.message = '';
  }

  startClass(){
    this.showScreen = 1;
    if(this.participantType == '0'){
      this.API.getMeeting(this.particpantID!).subscribe(data=>{
        if(data.success){
          if(data.output.length > 0){
            this.validateMeeting(data.output[0].meetingcode)
            this.meetingHeader = data.output[0].course
          }else{
            this.API.failedSnackbar('Selected class has no ongoing meet this time.', this.notifTime + 1000)
            this.API.resetMeetOptions();
            this.showScreen = 0;
          }
        }
      });
    }else{
      this.API.endMeeting(this.particpantID!).subscribe(()=>{
        this.createMeeting();
      });

    }
  }


  createMeeting(){
    const apiUrl = "https://api.videosdk.live/v2/rooms";
    const headers = new HttpHeaders({
      authorization: environment.token,
      'Content-Type': 'application/json',
    });

    console.log('Creating meeting...'); // Debug log

    this.http
      .post<{ roomId: string }>(apiUrl, {}, { headers })
      .pipe(map((response) => response.roomId)).subscribe((roomid) => {
        this.meetingID = roomid;

        this.sessionID = this.API.createID32();
        console.log('Calling startMeeting with:', {
          sessionID: this.sessionID,
          participantID: this.particpantID,
          meetingID: this.meetingID
        });

        this.API.startMeeting(this.sessionID,this.particpantID!, this.meetingID).subscribe(
          data=>{
            if(data.success){
              this.meetingHeader = `${this.API.meetingInfo.course} (${this.API.meetingInfo.class})`;
              console.log('Meeting started successfully, header:', this.meetingHeader);
              this.logMeetingActivity('started_class');
            }
            this.joinMeeting();
          },
          error=>{
            console.error('startMeeting error:', error); // Debug log
            this.API.failedSnackbar('Error while creating class', this.notifTime+1000);
          }
        )

      },
      error =>{
        console.log(error);
      }
      );
  }

  validateMeeting(meetingId: string) {
    const url = `https://api.videosdk.live/v2/rooms/validate/${meetingId}`;
    const headers = new HttpHeaders({
      authorization: environment.token,
      'Content-Type': 'application/json',
    });
    this.http
      .get<{ roomId: string }>(url, {
        headers,
      })
      .pipe(map((response) => response.roomId === meetingId)).subscribe(isValid=>{
        if (isValid) {
          this.meetingID = meetingId;
          this.joinMeeting();
        } else {
          console.log('Room expired')
        }
      },
      (error) => {
        console.error("Failed to validate meeting:", error);
      });
  }
  async initMeeting() {
    VideoSDK.config(environment.token);
    this.meeting = VideoSDK.initMeeting({
      meetingId: this.meetingID, // required
      participantId : this.particpantID,
      name: this.participantName, // required
      metaData: {'who': this.participantType},
      micEnabled: this.isMicOn, // optional, default: true
      webcamEnabled: this.isWebCamOn, // optional, default: true
    });
  }

  joinMeeting() {
    this.initMeeting();
    this.meeting.join();
    this.logMeetingActivity('joined_meeting');
    this.handleMeetingEvents(this.meeting);
    if(this.participantType == '1'){
      // this.API.notifyParticipants('You have an ongoing meet with '+ this.participantName+'.');
      this.API.notifyStudentsInClass(
        `${this.participantName} started a synchronous class.`,
        `${this.participantName} started a meet with your class <b>'${this.meetingInfo.class}'</b> on <b>'${this.meetingInfo.course}'</b>. Try to catch up with the meeting!.`
      )

    }
    setTimeout(() => {
      if (this.meetingID) {
        this.logMeetingActivity('joined_meeting');
      }
    }, 1000);
  }

  handleMeetingEvents(meeting: any) {
    meeting.on("error", (data:any) => {
      const { code, message } = data;
      console.log("Error",code,message);
      if(code == 3016){
        this.shareScreenLoading = false;
      }
      if(code == 3015){
        this.micLoading = false;
        this.API.failedSnackbar("Unable to start microphone, please check your browser permissions.");
      }
      if(code == 3014){
        this.webCamLoading = false;
        this.API.failedSnackbar("Unable to start camera, please check your browser permissions.");
      }
    });
    // meeting joined event
    meeting.on("meeting-joined", () => {
      this.localParticipant = meeting.localParticipant;
      this.handleStreamDisabled(
        undefined,
        meeting.localParticipant,
        true
      );
    });

    meeting.localParticipant.on("stream-enabled", (stream: any) => {
      this.handleStreamEnabled(
        stream,
        meeting.localParticipant,
        true
      );
    });
    meeting.localParticipant.on("stream-disabled", (stream: any) => {
      this.handleStreamDisabled(
        stream,
        meeting.localParticipant,
        true
      );
      this.showScreen = 2;
    });

    // meeting left event
    meeting.on("meeting-left", () => {
      this.API.justSnackbar(this.localParticipant.displayName+ ' left the meeting', this.notifTime)
      this.resetUI();
      if(this.participantType =='1'){
        this.API.endMeeting(this.particpantID!).subscribe();
      }
    });


    meeting.on("participant-joined", (participant: any) => {
      if(!this.meNotifDisplayed){
        if(participant.id == this.particpantID){
          this.API.justSnackbar(participant.displayName+ ' joined the meeting', this.notifTime);
          this.meNotifDisplayed = true;
        }
      }else{
        this.API.justSnackbar(participant.displayName+ ' joined the meeting', this.notifTime)
      }
      this.handleStreamDisabled(
        undefined,
        participant,
        true
      );
      participant.setQuality("med");
      this.participantSize = meeting.participants.size;
      if(this.largestParticipantSize < this.participantSize + 1){
        this.largestParticipantSize = this.participantSize + 1;
        this.API.updateParticipantCount(this.sessionID, this.largestParticipantSize);
      }
      if(participant.metaData.who == '1'){
        this.teacherName = participant.displayName;
      }
      participant.on("stream-enabled", (stream: any) => {
        this.handleStreamEnabled(
          stream,
          participant,
          false
        );
      });
      participant.on("stream-disabled", (stream: any) => {
        this.handleStreamDisabled(
          stream,
          participant,
          false
        );
      });
    });

    // participants left
    meeting.on("participant-left", (participant: any) => {
      this.participantSize = meeting.participants.size;
      this.API.justSnackbar(participant.displayName+ ' left the meeting', this.notifTime)
      this.participants.delete(participant.id);
      if(this.participantSharing.id == participant.id){
        this.shareSrc = undefined;
        this.isSharingScreen =false;
      }
      if(participant.metaData.who =='1'){
        this.API.endMeeting(participant.id).subscribe();
        this.meeting.end();
        this.resetUI();
      }
    });
    meeting.on("chat-message",(participantMessage:any)=>{
      const { __, _, text } = participantMessage;
      const data = JSON.parse(text);
      if(data.type == "webcam-enabled"){
        // if(data.who == '1'){
        //   this.webCamLoading = true;
        //   return;
        // }
        if(this.activeParticipants.has(data.senderID)){
          var participant = this.activeParticipants.get(data.senderID);
          if(participant != null){
            participant.isLoading = true;
            this.activeParticipants.set(data.senderID, participant)
          }else{
            participant = new ParticipantObject(data.senderName, undefined)
            participant.isLoading = true;
            this.activeParticipants.set(data.senderID, participant)
          }
        }else{
          var participant = this.participants.get(data.senderID);
          if(participant != null){
            participant.isLoading = true;
            this.participants.set(data.senderID, participant)
          }else{
            participant = new ParticipantObject(data.senderName, undefined)
            participant.isLoading = true;
            this.participants.set(data.senderID, participant)
          }
        }
        return;
      }
      if(data.type == 'share-enabled'){
        this.shareScreenLoading = true;
        return;
      }
      const now = new Date();
      const time =  now.toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
       });
      this.messages.push(new MessageObject(data.senderID, data.senderName, data.message, time, data.profile))
    })

    meeting.on("speaker-changed", (speakerID:any) => {
      if(speakerID != undefined && speakerID != null){
        if(this.participantType=='1'){
          return;
        }
         if(!this.activeParticipants.has(speakerID) && this.participants.has(speakerID)){
          const active =  this.participants.get(speakerID);
          this.participants.delete(speakerID);
          if(this.activeParticipants.size > 0){
            const inactiveKey = this.activeParticipants.keys().next().value;
            const inactive = this.activeParticipants.get(inactiveKey);
            this.activeParticipants.delete(inactiveKey);
            this.participants.set(inactiveKey, inactive!);
          }
          this.activeParticipants.set(speakerID, active!);
         }
      }
    });
  }

  getURL(file:string){
    return this.API.getURL( file);
  }

  leaveMeeting(){
    const userData = this.API.getUserData();
    if (userData) {
      this.logMeetingActivity('left_meeting');
    }

    this.meeting?.leave();
    if(this.participantType =='1'){
      this.logMeetingActivity('ended_meeting');
      this.API.notifyParticipants(this.participantName+ ' ended the meeting.');
      this.API.endMeeting(this.particpantID!).subscribe();
    }
  }

  raiseHand(){
    this.meeting?.sendChatMessage(JSON.stringify({ type: "RAISE_HAND", data: {} }));
  }

  toggleWebcam() {
    if(this.webCamLoading) return;
    if (this.isWebCamOn) {
      this.meeting.disableWebcam();
    } else {
      this.meeting.enableWebcam();
      // this.meeting.sendChatMessage(JSON.stringify({
      //   'senderID': this.particpantID,
      //   'senderName': this.participantName,
      //   'type': 'webcam-enabled',
      //   'who': this.participantType
      // }));
      if(this.participantType == '1'){
        this.webCamLoading = true;
      }
    }
  }

  shareScreen(){
    if(this.shareScreenLoading) return;
    if (this.isSharingScreen) {
      this.meeting?.disableScreenShare();
    } else {
      this.meeting?.enableScreenShare();
      this.meeting.sendChatMessage(JSON.stringify({
        'senderID': this.particpantID,
        'senderName': this.participantName,
        'type': 'share-enabled',
        'who': this.participantType
      }));
      // if(this.participantType == '1'){
        this.shareScreenLoading = true;
      // }

    }
  }


  sendMessage(){
    if(this.meeting == null){
      this.clearInput();
      return;
    }
    if(this.message.trim() != ''){
      this.meeting.sendChatMessage(JSON.stringify({
          'senderID': this.particpantID,
          'senderName': this.participantName,
          'message': this.message,
          'profile': this.profile
      }));
    }
    this.clearInput();
  }

  micLoading = false;

  async toggleMic() {
    if(this.micLoading) return;
    if (this.isMicOn) {
      this.meeting.muteMic();
    } else {
      this.meeting.unmuteMic();
      this.micLoading = true;
    }
  }

  resetUI(){
    this.showScreen = 0;
    this.participants.clear();
    this.participantsAudio.clear();
    this.activeParticipants.clear();
    this.meetingHeader = '';
    this.messages = [];
    this.meNotifDisplayed = false;
    this.webCamLoading = false;
    this.shareScreenLoading = false;
    this.micLoading = false;
    this.largestParticipantSize = 1;
    this.API.resetMeetOptions();
  }


  handleStreamEnabled(stream: any, participant: any, isLocal: boolean) {
    const mediaStream = new MediaStream();
    mediaStream.addTrack(stream.track);

    if (stream.kind == "video") {
      if (participant.metaData.who == '0') {
        if (this.activeParticipants.has(participant.id)) {
          this.activeParticipants.set(participant.id, new ParticipantObject(participant.displayName, mediaStream));
        } else {
          this.participants.set(participant.id, new ParticipantObject(participant.displayName, mediaStream));
        }
      } else {
        this.mainSrc = new ParticipantObject(participant.displayName, mediaStream);
      }
      if (participant.id == this.particpantID) {
        this.webCamLoading = false;
        this.isWebCamOn = true;
      }
      this.showScreen = 2;
    }

    if (stream.kind == "audio") {
      if (participant.id != this.particpantID) {
        this.participantsAudio.set(participant.id, new ParticipantObject(participant.displayName, mediaStream));
      } else {
        this.micLoading = false;
        this.isMicOn = true;
      }
    }

    // Handle screen share video
    if (stream.kind == "share") {
      if (!this.isSharingScreen) {
        if (participant.id == this.particpantID) {
          this.isSharingScreen = true;
        }
        this.shareSrc = new ParticipantObject(participant.displayName, mediaStream);
        this.participantSharing = {
          id: participant.id,
          name: participant.displayName,
        };
      }
      this.shareScreenLoading = false;
    }

    // Handle screen share audio
    if (stream.kind == "shareAudio") {
      const audioElement = new Audio();
      audioElement.srcObject = mediaStream;
      audioElement.play().catch(error => {
        console.error("Error playing shared audio:", error);
      });
    }
  }

  handleStreamDisabled(
    stream: any,
    participant: any,
    isLocal: any,
  ) {
    if(stream == undefined){
      if(participant.metaData.who == '0'){
        if(this.activeParticipants.has(participant.id)){
          this.activeParticipants.set(participant.id,new ParticipantObject(participant.displayName, undefined))
        }else{
          this.participants.set(participant.id,new ParticipantObject(participant.displayName, undefined))
        }

      }else{
        this.mainSrc = undefined;
      }
      this.showScreen = 2;
    }else{
      if (stream.kind == "video") {
        if(participant.metaData.who == '0'){
          if(this.activeParticipants.has(participant.id)){
            this.activeParticipants.set(participant.id,new ParticipantObject(participant.displayName, undefined))
          }else{
            this.participants.set(participant.id,new ParticipantObject(participant.displayName, undefined))
          }
        }else{
          this.mainSrc = undefined;
        }
        if(participant.id == this.particpantID){
          this.isWebCamOn = false;
        }
        this.showScreen = 2;
      }

      if(stream.kind == 'audio'){
        this.isMicOn = false;
      }

      if (stream.kind == "share") {
        this.shareSrc = undefined;
        this.isSharingScreen =false;
        if(participant.id == this.particpantID){
          // if(this.isWebCamOn){
            // this.meeting.enableWebcam();
            // this.webCamLoading = true;
          // }
        }
        this.showScreen = 2;
      }
    }
  }
  openWhiteboard() {
    this.router.navigateByUrl('/open-whiteboard');
  }

  private saveStudentActivityToDashboard(userId: string, action: string): void {
    // Use the EXACT same API call that works for teachers
    this.API.startMeeting(this.sessionID, userId, this.meetingID);
    
    // Or if you want to save the activity separately, use the same method name
    this.API.post('create_entry', {
      method: 'create_entry', // Use whatever method startMeeting uses
      body: {
        // Use the same structure that works
        sessionID: this.sessionID,
        participantID: userId,
        meetingID: this.meetingID,
        activity_type: action,
        user_type: 'student'
      }
    }).subscribe({
      next: (response) => {
        console.log('Student activity saved:', response);
      },
      error: (error) => {
        console.error('Failed to save student activity:', error);
      }
    });
  }

  private saveStudentToSpeechAttendance(studentId: string, action: string): void {
    // Create a unique key for this activity
    const activityKey = `${studentId}_${this.meetingID}_${action}`;
    
    // Check if we already logged this activity recently (within 5 seconds)
    if (this.recentlyLoggedActivities.has(activityKey)) {
      console.log('🔍 Activity already logged recently, skipping:', activityKey);
      return;
    }
    
    // Mark this activity as recently logged
    this.recentlyLoggedActivities.set(activityKey, Date.now());
    
    // Clean up old entries (older than 10 seconds)
    const now = Date.now();
    for (const [key, timestamp] of this.recentlyLoggedActivities.entries()) {
      if (now - timestamp > 10000) { // 10 seconds
        this.recentlyLoggedActivities.delete(key);
      }
    }

    console.log('🔍 saveStudentToSpeechAttendance called:', {
      studentId,
      action,
      meetingID: this.meetingID,
      timestamp: new Date().toISOString(),
      stack: new Error().stack // This will show the call stack
    });

    // First, create a lab_meetings entry
    const labMeetingData = {
      tables: 'lab_meetings',
      values: {
        id: this.meetingID, // Use the meeting ID as the lab meeting ID
        labid: 1, // Use your existing speech lab
        teacherid: 'b58f25d75ce64dc995627e5c238834c4', // Use Agnes's teacher ID
        meetingcode: this.meetingID,
        participants: 1,
        starttime: new Date().toISOString()
      }
    };

    // Create the lab meeting first
    this.API.post('create_entry', {
      data: JSON.stringify(labMeetingData)
    }).subscribe({
      next: (response) => {
        console.log('Lab meeting created:', response);
        
        // Then create the speech_attendance entry
        const attendanceData = {
          tables: 'speech_attendance',
          values: {
            studentid: studentId,
            meetingid: this.meetingID, // This now references the lab_meetings entry
            timein: new Date().toISOString()
          }
        };

        this.API.post('create_entry', {
          data: JSON.stringify(attendanceData)
        }).subscribe({
          next: (response) => {
            console.log('Student activity saved to speech_attendance:', response);
          },
          error: (error) => {
            console.error('Failed to save student activity:', error);
          }
        });
      },
      error: (error) => {
        console.error('Failed to create lab meeting:', error);
      }
    });
  }
  
  private saveStudentAttendance(studentId: string, labMeetingId: string, action: string): void {
    const attendanceData = {
      studentid: studentId,
      meetingid: labMeetingId, // Use the lab_meetings ID
      timein: new Date().toISOString(),
      action_type: action
    };
    
    // Now save to speech_attendance table
    this.API.post('create_entry', {
      method: 'create_entry',
      body: attendanceData
    }).subscribe({
      next: (response) => {
        if (response && response.success) {
          console.log(`Student ${action} saved to speech_attendance table`);
        } else {
          console.log('Failed to save student attendance:', response);
        }
      },
      error: (error) => {
        console.error('Error saving student attendance:', error);
      }
    });
  }

  private saveStudentActivityToMeetings(studentId: string, action: string): void {
    // Use the EXACT same method that works for teachers
    // Create a unique session ID for this student activity
    const studentSessionId = this.API.createID32();
    
    // Use startMeeting with student data - this should work since it works for teachers
    this.API.startMeeting(studentSessionId, studentId, this.meetingID).subscribe({
      next: (response: any) => {
        if (response && response.success) {
          console.log(`Student ${action} successfully logged to meetings table via startMeeting`);
        } else {
          console.log(`Student ${action} logged but startMeeting returned:`, response);
        }
      },
      error: (error: any) => {
        console.error(`Error logging student ${action} via startMeeting:`, error);
      }
    });
  }

}
