Isse 1: 

Save Profile is giving unexpected error on both save adn browse jobs. it happens whenever a user clicks on save profile, after updating all his profile jobs. it activates on clicking both the btns.

Screenshot: 
./context_pictures/issue1.png

severity: low
priority: medium

Issue 2:

Candidate Portal > Hiring section > TCS NQT Card (job area) here location is not needed.

Screenshot: 
./context_pictures/issue2.png

severity: low
priority: low


Issue 3: 

Candidate portal > Dashboard. whenever I open the dashboard on candidate portal, till he has not got offer letter of applied for a job. the frontend toasts me this error: 

The requested resource was not found

Screenshot: ./context_pictures/issue3.png

severity: low
priority: medium


// These are a class of several types of validation errors: 

Issue 4: 

Candidate portal > profile completion

Jamshedpur cannot be in assam. validation needs to be added here, first state should be selected based on dropdown and then city should be shown based on which state was selected, ie city should also be dropdown

Screenshot; ./context_pictures/issue4.png

severity: low
priority: medium

Issue 5: 

currently there is no validation for class 10th passing year. it can be put as 2005 whlie the dob being 2008. which makes no sense. it should be logical... same for class 12th. class 12th passing year can be added before passing year of class 10th. which is again illogical. so validation should be here too. 

severity: medium
priority: medium



Issue 6: 

Certification section would be removed. this is not needed

severity: low
priority: low

Issue: Btech etc should be 4 years in duration, it should reflect in the validation, the person should not enter 5 years of btech like 2020 to 2025. similarly all other courses should reflect their timespan in it and validation should be applied like that. only under other, it can be put freely. but still passing year should be larger than starting year. 

severity: medium
priority: medium



Issue 7:

The candidate stepper profile form fillup currently saves things when I move to next section. thats fair and all, but it is also not allowing changes and is locking things if I move to the next section. it should not behave this way. I should be able to go back and see my saved changes during the stepper filling and even change things but once I hit submit at the end of the stepper form. it should then trigger a modal for confirmation that they won't be able to change certain fields if they submit and if they are sure that they want to submit. and then they hit submit and it then locks the changes

severity: low
priority: low



Issue 8: skills, just keep one skills form, not primary and secondary skills

severity: low
priority: low


Issue: 9


There should not be city name in brackets if there is a city name before it. why have 2 city names. fix is needed. 

Screenshot: ./context_pictures/issue9.png
