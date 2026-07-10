- please make the entire design of the site cohesive. use consistent spacing and padding. make sure everything looks neat, clean and aligned, spacing, margins and paddings are the worst currently. make the UI look appealing and not ugly. you can work on the UI and UX this time...

// for images, you can find them in the folder ./context_pictures/

# Candidate Portal

- page is automatically getting reloaded and loader is appearing every 30 seconds or so. why? 

- The candidate is elligible to appear for an assessement or hiring drive (They can stil apply to the hiring drive). only if scores of 10th 12th and btech grade (all should be above 60%) is above 60 percent. then only he will be able to click the apply for drive button. else it will be grayed out. and reason can be mentioned under the btn or somewhere in that page that the candidate is not eligible. 

## Dashboard

- The "your Journey" section should not be in the dashboard,  a better place for it would be on the my applications section. you can also make it vertical so it appears as the image in next-step-application-reference.jpeg.<next-step-application-reference.jpeg> 



### Personal 

- DOB in candidate portal is unvalidated, we can currently enter future dates. there should be a age limit.
- pin code validation is not there. 
- state should be drop down. 
- DOB and gender should be fixed after saving the details in the portal for the candidate. ie they should be grayed out and should be non editable. 

### Academic

- it should not allow future dates. (passing year) 
- passing year is showing "required", a generic error msg for any validation error
- school board, degree, university etc should be dropdown and there should be an others field in dropdown if the specified college etc is not in the dropdown.
- despcriptive validation msg for CGPA
- in Bachelors degree, starting year and passing year, both should be present
- plus btn for optional education (additional)
- no "data saved successfully" toast on submiting the candidate profile update form section stepper. 
- the "next" btn should be replaced by "save and next".
- All academic details must be grayed out once the candidate submits their details of their profile. they should be fixed after saving the details.

### Skills and Resume

- in skills and resume section, in primary skills part, entering comma or hitting carriage return should turn it into a pill 
- in Certifications textarea, it should not be a text-area, it should be like "certification 1" and a textarea about it and then a file upload than a + btn to add another certification and the same thing with it, see <certification_label_and_fileupload_req.png>

- no space or margin/padding between Resume and Required.

### Location Preferences

- Location Preferences field should be dropdown - *****
- (bug) even after updating all the details of the candidate properly, the ui is complaining "Still missing: Date of Birth, Gender, Address, City, State, Pincode, 10th Details, 12th Details, Graduation Details, Primary Skills, Location Preferences (3 required)"
- Location Preferences details must be grayed out once the candidate submits their details of their profile. they should be fixed after saving the details.


## Hiring Drive section

- There should be only one drive appearing with its date mentioned. (TCS NQT?) and there should be "apply for drive btn". it should be generic and there should be no mention of any tech stacks. 
- "My applications" should be changed to "Track my application"
- Image of track my application is there, and the track my application should have a design with vertical line showing chronological events like offer letter given, acceptance. etc.
- if offer letter is there, a new sidebar element would be added showing offer letter that will let the user download the offer letter and either reject and accept it (additional) *


## My offers
- (major bug): there is no accept offer or reject offer btn on this section.
due to this, the pipeline is broken, because the candidate cannot be move to BGC in HR portal and further stages if he cannot accept the offer letter.

# HR

## Dashboard

- dashboard looks ugly and has poor spacing, margin and alignment issues <HR_dashboard_UI_polish_needed.png>


## Assessments

- scrollbar issue, two scrollbar should be there be two different lists. see <HR_assessment_double_scrollbar.png>
- since there is only one drive happening, so there should be passout year instead of Drive/Role in the coloumn of eligible applicants and active assessments.
- See the image <HR_assessment_right_Side.jpeg>
 this is what I want in the right side, ie on the active assessment section, instead of it being that, I want it to be like this image. where there should be two containers stacked vertically, one containing the excel sheet upload which will get the excel sheet containing the marks details of the candidate and it will update things in the below container accordingly. it will compare the score of individual against a cutoff and then update status below and then if he passes. he will autmatically be moved to the offer letter section.
 
- There is no need of action btn in the active assessments section
- rename the active assessments title to "Assessment status".
- status should be "result in progress", "Passed", "Failed".
- since we are already checking and filtering candidates based on their marks being greater than 60 percent. there is no need for the Assign all eligible btn here in the assessments section.
- Score updation will be automated by uploading the excel sheet. WE DO NOT WANT A ENTER SCORE button in the UI anywhere. no manual entering of scores will be done. *****
- we do not want to *manually* move a candidate to the next stage using the portal by updating his score and remarks in the portal. it should happen based on the data present in the excel sheet. (sending offer letters, which will be done in one click by HR). Any candidate who scores more than a specified cutoff marks will get to the offer letter and others will be disqualified.
- Those who will get offer letters, will be shown in offer letter section in HR portal, so we don't need the assign assessment, shortlist and the reject button. actually the header that appears when we select a candidate makes no sense. it can be discarded. the application page can be there just to show the status of candidates and so that HR can search through different candidates and see their status, and also remove checkboxes around each row and in the coloumn for selecting things. Refer to the image. <HR_Application_remove_header.png>


## Offer Letter Section

- (Bug): after clearing the assesement assigned by HR, the candidate data should be in the offer letter section so that the HR can send the offer letter to them. *****. this suggests that the pipeline is broken is somewhere. so it must be fixed. currently it is handled by the header in the application. but we would like to remove it as I earlier said.


