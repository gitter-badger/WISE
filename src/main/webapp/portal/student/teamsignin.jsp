<%@ include file="../include.jsp"%>

<!DOCTYPE html>
<html dir="${textDirection}">
<head>
<meta http-equiv="Content-Type" content="text/html;charset=utf-8" />
<link rel="shortcut icon" href="${contextPath}/<spring:theme code="favicon"/>" />
<title><spring:message code="student.teamsignin.teamSignIn" /></title>

<link href="${contextPath}/<spring:theme code="globalstyles"/>" media="screen" rel="stylesheet"  type="text/css" />
<link href="${contextPath}/<spring:theme code="stylesheet"/>" media="screen" rel="stylesheet" type="text/css" />
<link href="${contextPath}/<spring:theme code="jquerystylesheet"/>" media="screen" rel="stylesheet" type="text/css" />

<script src="${contextPath}/<spring:theme code="jquerysource"/>" type="text/javascript"></script>
<script src="${contextPath}/<spring:theme code="jqueryuisource"/>" type="text/javascript"></script>
<script src="${contextPath}/<spring:theme code="generalsource"/>" type="text/javascript"></script>

<style>
/* hides the close button on the loading modal dialog so students can't close it */
.ui-dialog-titlebar-close {
  visibility: hidden;
}
</style>

<script type="text/javascript">

    /**
     * Called when the student clicks on the "absent today" link
     */
    function teammateAbsent(teammateAbsentIndex) {
        //clear the username from the form
		document.getElementById("username" + teammateAbsentIndex).value = "";
    }
    
    /**
     * An absent checkbox was clicked
     * @param teammateIndex the index of the teammate
     */
    function absentClicked(teammateIndex) {
        
    	if ($('#absent' + teammateIndex).prop('checked')) {
    	    // the user is absent
    	    $('#password' + teammateIndex).prop('disabled', true);
    	    $('#password' + teammateIndex).css('background-color', 'lightgrey');
    	    
            // clear the associated password field
            $('#password' + teammateIndex).val('');
    	} else {
    	    // the user is not absent
    	    $('#password' + teammateIndex).prop('disabled', false);
    	    $('#password' + teammateIndex).css('background-color', '');
    	}
    }
    
    /**
     * Initialize the form by greying out password fields if a
     * teammate is specified as absent
     */
    function initializeForm() {
        
        // loop through all the teammates
        for (var i = 1; i < 10; i++) {
            var teammateIndex = i + 1;
            
            if ($('#absent' + teammateIndex).prop('checked')) {
                // the absent checkbox is checked so we will grey out and disable the password field
                $('#password' + teammateIndex).prop('disabled', true);
                $('#password' + teammateIndex).css('background-color', 'lightgrey');
            }
        }
    }
    
    $(document).ready(function() {
    	$("#runproject").click(function() {
	    	// show a loading dialog while the form is being submitted.
	    	if ($("#loadingDialog").length == 0) {
	    		var loadingDialog = $("<div>").attr("id","loadingDialog").attr("title", "<spring:message code='student.teamsignin.loading'/>").html("<spring:message code='student.teamsignin.loading'/>");
	    		$(document).append(loadingDialog);
	    		loadingDialog.dialog({
	                height: 140,
	                modal: true,
	                draggable: false
	            });
	    	}
        })
        
        initializeForm();
    });
</script>
</head>
<body style="background-color:#333333;">

<div id="teamSelect" class="teamMargin2">
	<div id="teamSelectHeader"><span style="color:#0000CC;"><sec:authentication property="principal.username" /></span> <spring:message code="student.teamsignin.alreadySignedIn"/></div>
	<div id="teamSelectHeader"><spring:message code="student.teamsignin.othersSignIn"/></div>
	<c:set var="runId" value='<%= request.getParameter("runId") %>' />
	<form:form method="post" action="teamsignin.html?runId=${runId}" commandName="teamSignInForm" id="teamSignInForm" autocomplete='off'>
			<table id="multiUserSignIn" border="0" cellspacing="0" cellpadding="2">
		  		<tr id="multiUserSeparatorRow">
					<td colspan="3"></td>
				</tr>
				<tr>
		  			<td><label for="username1"><spring:message code="student.teamsignin.username"/> 1:</label></td>
		     		<td><form:input disabled="true" path="username1" id="username1" style="background-color:lightgrey"/></td>
		     		<td id="teamSignMessages"><spring:message code="student.teamsignin.alreadySignedIn"/></td>
				</tr>
				<tr id="multiUserSeparatorRow">
					<td colspan="3"></td>
				</tr>
		  		<c:forEach var="teammate_index" begin="2" end="${teamSignInForm.maxWorkgroupSize}" step="1">
			  		<c:set var="thisUsername" value="username${teammate_index}" />
			  		<c:set var="thisIsExistingMember" value="existingMember${teammate_index}" />
			  		<tr>
			    		<td><label for="username${teammate_index}"><spring:message code="student.teamsignin.username"/> ${teammate_index}:</label></td>
                        <c:choose>
							<c:when test="${teamSignInForm[thisIsExistingMember]}">
				    	    	<td><form:input readonly="true" path="username${teammate_index}" id="username${teammate_index}" style="background-color:lightgrey"/></td>
							</c:when>
							<c:otherwise>
				        		<td><form:input path="username${teammate_index}" id="username${teammate_index}"/></td>
							</c:otherwise>
                        </c:choose>
		        		<td class="errorMsgStyle"><form:errors path="username${teammate_index}" /></td>
		        	</tr>
					<tr>
		 				<td><label for="password${teammate_index}"><spring:message code="student.teamsignin.password"/></label></td>
		        		<td><form:password path="password${teammate_index}" id="password${teammate_index}"/></td>
		        		<td class="errorMsgStyle"><form:errors path="password${teammate_index}" /></td>
			        </tr>
			        <tr class="multiUserAbsentRow">
			            <c:choose>
                            <c:when test="${teamSignInForm[thisIsExistingMember]}">
                                <td>Absent: <form:checkbox id="absent${teammate_index}" path="absent${teammate_index}" onclick="absentClicked(${teammate_index})"/></td>
                            </c:when>
                            <c:otherwise>
                                <td></td>
                            </c:otherwise>
                        </c:choose>
		    	    	<td></td>
		        		<td></td>
			        </tr>
					<tr id="multiUserSeparatorRow">
						<td colspan="3"></td>
					</tr>
		  		</c:forEach>
			</table>
			
	<div><a href="${contextPath}/forgotaccount/student/passwordreminder.html" id="forgotlink"><spring:message code="student.teamsignin.forgotUsernameOrPassword"/></a>  </div>
	
	 <div id="finalRunProjectButton" onclick="setTimeout('self.close()', 15000);">
 	    <input type="submit" class="wisebutton" name="_finish" value="Run Project" id="runproject" />
	</div>
					
	</form:form>
</div>
</body>
</html>