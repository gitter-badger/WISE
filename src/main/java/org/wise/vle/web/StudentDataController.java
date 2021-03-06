/**
 * Copyright (c) 2008-2015 Regents of the University of California (Regents). 
 * Created by WISE, Graduate School of Education, University of California, Berkeley.
 * 
 * This software is distributed under the GNU General Public License, v3,
 * or (at your option) any later version.
 * 
 * Permission is hereby granted, without written agreement and without license
 * or royalty fees, to use, copy, modify, and distribute this software and its
 * documentation for any purpose, provided that the above copyright notice and
 * the following two paragraphs appear in all copies of this software.
 * 
 * REGENTS SPECIFICALLY DISCLAIMS ANY WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE. THE SOFTWARE AND ACCOMPANYING DOCUMENTATION, IF ANY, PROVIDED
 * HEREUNDER IS PROVIDED "AS IS". REGENTS HAS NO OBLIGATION TO PROVIDE
 * MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.
 * 
 * IN NO EVENT SHALL REGENTS BE LIABLE TO ANY PARTY FOR DIRECT, INDIRECT,
 * SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS,
 * ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS DOCUMENTATION, EVEN IF
 * REGENTS HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
package org.wise.vle.web;

import java.io.File;
import java.io.IOException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Iterator;
import java.util.List;
import java.util.Properties;
import java.util.Set;
import java.util.Vector;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.socket.WebSocketHandler;
import org.wise.portal.dao.ObjectNotFoundException;
import org.wise.portal.domain.module.impl.CurnitGetCurnitUrlVisitor;
import org.wise.portal.domain.run.Run;
import org.wise.portal.domain.user.User;
import org.wise.portal.domain.workgroup.Workgroup;
import org.wise.portal.presentation.web.controllers.ControllerUtil;
import org.wise.portal.service.offering.RunService;
import org.wise.portal.service.vle.VLEService;
import org.wise.portal.service.websocket.WISEWebSocketHandler;
import org.wise.vle.domain.annotation.Annotation;
import org.wise.vle.domain.node.Node;
import org.wise.vle.domain.peerreview.PeerReviewWork;
import org.wise.vle.domain.project.Project;
import org.wise.vle.domain.user.UserInfo;
import org.wise.vle.domain.work.StepWork;
import org.wise.vle.utils.VLEDataUtils;

/**
 * Controller for handling WISE4 student data
 * @author Geoffrey Kwan
 * @author Hiroki Terashima
 */
@Controller
@RequestMapping("/studentData.html")
public class StudentDataController {

	@Autowired
	private VLEService vleService;
	
	@Autowired
	private RunService runService;
	
	@Autowired
	private Properties wiseProperties;
	
	@Autowired
	private WebSocketHandler webSocketHandler;

	private static boolean DEBUG = false;

	// max size for all student work size, in bytes. Default:  500K = 512000 bytes
    private int studentMaxWorkSize = 512000;

	@RequestMapping(method = RequestMethod.GET)
	public ModelAndView doGet(HttpServletRequest request, HttpServletResponse response)
					throws ServletException, IOException {

		//get the signed in user
		User signedInUser = ControllerUtil.getSignedInUser();
		
		/*
		 * obtain the get parameters. there are two use cases at the moment.
		 * 1. only userId is provided (multiple userIds can be delimited by :)
		 * 		e.g. 139:143:155
		 * 2. only runId and nodeId are provided
		 */
		String userIdStr = request.getParameter("userId");  // these are actually workgroupId's in the portal, 
		// NOT the userId in the vle_database.
		// to convert to userId, see the mapping in userInfo table.
		String nodeId = request.getParameter("nodeId");
		String runIdStr = request.getParameter("runId");
		String type = request.getParameter("type");
		String nodeTypes = request.getParameter("nodeTypes");
		String nodeIds = request.getParameter("nodeIds");
		String getAllWorkStr = request.getParameter("getAllWork");
		String getRevisionsStr = request.getParameter("getRevisions");
		String getAllStepWorks = request.getParameter("getAllStepWorks");
		
		if (userIdStr == null) {
			/*
			 * this request was most likely caused by a session timeout and the user logging
			 * back in which makes a request to studentData.html without any parameters.
			 * in this case we will just redirect the user back to the WISE home page.
			 */
			return new ModelAndView("redirect:/");
		}
		
		//the get request can be for multiple ids that are delimited by ':'
		String[] userIdArray = userIdStr.split(":");
		
		Long runId = null;
		if (runIdStr != null) {
			try {
				//get the run id as a Long
				runId = new Long(runIdStr);
			} catch (NumberFormatException e) {
				e.printStackTrace();
			}
		}
		
        if ("true".equals(getAllStepWorks)) {
            // get all the raw work
            
            JSONArray allStepWorkJSONObjects = new JSONArray();
            
            //long currentTimeMillis1 = System.currentTimeMillis();
            
            // get all the StepWork from the users
            List<StepWork> allStepWorks = getAllStepWorks(userIdArray);
            //List<StepWork> allRawWork = vleService.getStepWorksByRunId(runId);
            
            //long currentTimeMillis2 = System.currentTimeMillis();
            //System.out.println("Query Database Time=" + (currentTimeMillis2 - currentTimeMillis1));
            //System.out.println("Number of Rows=" + allStepWorks.size());
            
            Iterator<StepWork> allWorkIterator = allStepWorks.iterator();
            
            // loop through all the StepWorks
            while (allWorkIterator.hasNext()) {
                StepWork stepWork = allWorkIterator.next();
                JSONObject stepWorkJSONObject = stepWork.toJSON();
                allStepWorkJSONObjects.put(stepWorkJSONObject);
            }
            
            //long currentTimeMillis3 = System.currentTimeMillis();
            //System.out.println("Create JSONObjects Time=" + (currentTimeMillis3 - currentTimeMillis2));
            
            // write the step work JSON objects to the response
            response.setContentType("application/json");
            response.getWriter().write(allStepWorkJSONObjects.toString());
            
            //long currentTimeMillis4 = System.currentTimeMillis();
            //System.out.println("Write Response Time=" + (currentTimeMillis4 - currentTimeMillis3));
            
            return null;
        }
		
		Run run = null;
		if (runId != null) {
			try {
				//get the run object
				run = runService.retrieveById(runId);				
			} catch (ObjectNotFoundException e1) {
				e1.printStackTrace();
			}
		}
		
		boolean allowedAccess = false;
		
		/*
		 * teachers that are owners of the run can make a request
		 * students that are accessing their own work can make a request
		 * students that are accessing aggregate data for a step can make a request
		 */
		if (SecurityUtils.isAdmin(signedInUser)) {
			//the user is an admin so we will allow this request
			allowedAccess = true;
		} else if (SecurityUtils.isTeacher(signedInUser) && SecurityUtils.isUserOwnerOfRun(signedInUser, runId)) {
			//the teacher is an owner or shared owner of the run so we will allow this request
			allowedAccess = true;
		} else if (SecurityUtils.isStudent(signedInUser) && SecurityUtils.isUserInRun(signedInUser, runId)) {
			//the user is a student
			
			if (type == null) {
				//the student is trying to access their own work
				
				Long workgroupId = null;
				
				try {
					//get the workgroup id
					workgroupId = new Long(userIdStr);
				} catch (NumberFormatException e) {
					
				}
				
				//check if the signed in user is really in the workgroup
				if (SecurityUtils.isUserInWorkgroup(signedInUser, workgroupId)) {
					//the signed in user is really in the workgroup so we will allow this request
					allowedAccess = true;
				}
			} else if (type.equals("brainstorm") || type.equals("aggregate")) {
				//the student is trying to access work from their classmates
				
				/*
				 * boolean value to keep track of whether all the workgroup ids
				 * that the user is trying to access work for is in the run.
				 * this will be set to false if we find a single workgroup id that
				 * is not in the run.
				 */
				boolean allWorkgroupIdsInRun = true;
				
				//loop through all the classmate workgroup ids
				for (int x = 0; x < userIdArray.length; x++) {
					//get a workgroup id
					String classmateWorkgroupIdString = userIdArray[x];

					Long classmateWorkgroupId = null;
					try {
						classmateWorkgroupId = new Long(classmateWorkgroupIdString);					
					} catch (NumberFormatException e) {
						
					}
					
					//check if the workgroup id is in the run
					if (!SecurityUtils.isWorkgroupInRun(classmateWorkgroupId, runId)) {
						//the workgroup id is not in the run
						allWorkgroupIdsInRun = false;
						break;
					}
				}
				
				//only allow access if all the workgroup ids are in the run
				if (allWorkgroupIdsInRun) {
					allowedAccess = true;
				}
			}
		}
		
		if (!allowedAccess) {
			//the user is not allowed to make this request
			response.sendError(HttpServletResponse.SC_FORBIDDEN);
			return null;
		}

		/* set headers so that browsers don't cache the data (due to ie problem */
		response.setHeader("Pragma", "no-cache");
		response.setHeader("Cache-Control", "no-cache");
		response.setDateHeader("Expires", 0);
		response.setContentType("application/json");

		// override userIdStr if user is requesting for aggregate and showAllStudents is requested
		if ("aggregate".equals(type) && Boolean.parseBoolean(request.getParameter("allStudents"))) {
			// request for all students work in run. lookup workgroups in run and construct workgroupIdString
			String workgroupIdStr = "";
			try {
				Set<Workgroup> workgroups = runService.getWorkgroups(runId);
				for (Workgroup workgroup : workgroups) {
					workgroupIdStr += workgroup.getId() + ":";
				}
				request.setAttribute("userId", workgroupIdStr);
				
				userIdStr = workgroupIdStr;
				
				userIdArray = userIdStr.split(":");
			} catch (ObjectNotFoundException e) {
				
			}	
		}

		//whether to get the work that has empty states
		boolean getAllWork = false;

		//whether to get the latest revision or all revisions with nodestates
		boolean getRevisions = true;

		if (DEBUG) {
			System.out.println("userIdStr: " + userIdStr);
			System.out.println("nodeId: " + nodeId);
			System.out.println("runId: " + runId);
			System.out.println("type: " + type);
			System.out.println("nodeTypes: " + nodeTypes);
			System.out.println("nodeIds: " + nodeIds);
		}

		if (getAllWorkStr != null) {
			getAllWork = Boolean.parseBoolean(getAllWorkStr);
		}

		if (getRevisionsStr != null) {
			getRevisions = Boolean.parseBoolean(getRevisionsStr);
		}

		//the list that contains the types of nodes we want to return
		List<String> nodeTypesList = null;

		if (nodeTypes != null) {
			//break the nodeTypes parameter into an array
			String[] nodeTypesArray = nodeTypes.split(":");

			//create a list that will contain all the node types we want
			nodeTypesList = Arrays.asList(nodeTypesArray);
		}

		//the list that will contain the Node objects we want
		List<Node> nodeList = new ArrayList<Node>();
		if (nodeIds != null) {
			//split up the nodeIds which are delimited by :
			String[] nodeIdsArray = nodeIds.split(":");

			//loop through the node ids
			for (int x=0; x < nodeIdsArray.length; x++) {
				//obtain a handle on the Node with the node id
				Node tempNode = vleService.getNodeByNodeIdAndRunId(nodeIdsArray[x], runIdStr);

				if (tempNode != null) {
					//add the Node to our list
					nodeList.add(tempNode);					
				}
			}
		}

		// If we're retrieving data to be displayed for aggregate view, ensure that nodeIds are passed in
		// and that we can access students' work for those nodes.
		if ("aggregate".equals(type)) {
			if (nodeList.isEmpty()) {
				// node to aggregate from does not exist. exit.
				response.sendError(HttpServletResponse.SC_BAD_REQUEST, "get data node list is empty for aggregrate type");
				return null;
			}
			// now make sure that we can access students' work for all the nodes in the nodeList.

			//get the path to the project on the server
			String curriculumBaseDir = wiseProperties.getProperty("curriculum_base_dir");
			String rawProjectUrl = (String) run.getProject().getCurnit().accept(new CurnitGetCurnitUrlVisitor());
			String projectPath = curriculumBaseDir + rawProjectUrl;

			File projectFile = new File(projectPath); // create a file handle to the project file
			Project project = new Project(projectFile); // create a Project object so we can easily get info about the project.

			boolean nodeWorkAccessibleForAggregate = true;
			for (Node nodeToCheck : nodeList) {
				// make sure that we can get the student work for all of the nodes that were requested to be aggregated
				nodeWorkAccessibleForAggregate &= project.isNodeAggregatable(nodeToCheck);
			}
			if (!nodeWorkAccessibleForAggregate) {
				// we cannot get data from at least one node in the nodeList. throw an error and exit.
				response.sendError(HttpServletResponse.SC_BAD_REQUEST, "specified node is allowed for aggregation");
				return null;
			}
		}

		try {
			//this case is when userId is passed in as a GET argument
			// this is currently only being used for brainstorm steps and aggregate steps

			if (nodeId != null && !nodeId.equals("")) {
				/*
				 * return an array of node visits for a specific node id.
				 * this case uses userIdStr and nodeId.
				 */

				Node node = vleService.getNodeByNodeIdAndRunId(nodeId, runIdStr);

				List<UserInfo> userInfos = new ArrayList<UserInfo>();

				for (int x = 0; x < userIdArray.length; x++) {
					UserInfo userInfo = vleService.getUserInfoByWorkgroupId(new Long(userIdArray[x]));

					if (userInfo != null) {
						userInfos.add(userInfo);
					}
				}

				List<StepWork> stepWorkList = vleService.getStepWorksByUserInfosAndNode(userInfos, node);

				JSONArray stepWorks = new JSONArray();

				for (StepWork stepWork : stepWorkList) {
					Long userId = stepWork.getUserInfo().getWorkgroupId();
					String dataString = stepWork.getData();
					JSONObject data = new JSONObject(dataString);
					data.put("visitPostTime", stepWork.getPostTime());
					String stepWorkId = stepWork.getId().toString();

					JSONObject userIdAndData = new JSONObject();
					userIdAndData.put("userId", userId);
					userIdAndData.put("data", data);
					userIdAndData.put("stepWorkId", stepWorkId);
					userIdAndData.put("id", stepWork.getId());

					stepWorks.put(userIdAndData);
				}

				response.getWriter().write(stepWorks.toString());
			} else {
				/*
				 * return an array of vle states
				 * this case uses userIdStr, runId, nodeTypes
				 */

				//multiple user ids were passed in
				if (userIdArray != null && userIdArray.length > 0) {
					//the parent json object that will contain all the vle states
					JSONObject workgroupNodeVisitsJSON = new JSONObject();

					//retrieve data for each of the ids
					for (int x = 0; x < userIdArray.length; x++) {
						String userId = userIdArray[x];

						// obtain all the data for this student
						UserInfo userInfo = vleService.getUserInfoByWorkgroupId(new Long(userId));
						JSONObject nodeVisitsJSON = new JSONObject();  // to store nodeVisits for this student.

						//Get student's last stepwork.
						StepWork latestWork = vleService.getLatestStepWorkByUserInfo(userInfo);
						if (latestWork != null && latestWork.getPostTime() != null) {

							if (nodeList.size() == 0) {
								nodeList = vleService.getNodesByRunId(runIdStr);
							}
							nodeVisitsJSON = getNodeVisitsForStudent(nodeList, nodeTypesList, userInfo, run, getAllWork, getRevisions);

						} else {
							/*
							 * the user does not have any work so we will just set the userName and
							 * userId and an empty visitedNodes array in the JSON for the user
							 */
							nodeVisitsJSON.put("userName", new Long(userId));
							nodeVisitsJSON.put("userId", new Long(userId));
							String nodeVisitKeyName = "visitedNodes";  // used in WISE4
							if (run != null) {
							    org.wise.portal.domain.project.Project project = run.getProject();
							    if (project != null) {
							        Integer wiseVersion = project.getWiseVersion();
							        if (wiseVersion != null && wiseVersion == 5) {
							            nodeVisitKeyName = "nodeVisits";  // used in WISE5
							        }
							    }
							}
							nodeVisitsJSON.put(nodeVisitKeyName, new JSONArray());
						}

						workgroupNodeVisitsJSON.append("vleStates", nodeVisitsJSON);
					}
					response.getWriter().write(workgroupNodeVisitsJSON.toString());
				}
			}

		} catch (IOException e) {
			e.printStackTrace();
		} catch (JSONException e) {
			e.printStackTrace();
		} catch (OutOfMemoryError e) {
			response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
		}
		return null;
	}

	/**
	 * Returns nodeVisits for the specified student user as a JSON object.
	 * @param nodeList
	 * @param nodeTypesList
	 * @param userInfo
	 * @param getAllWork whether to get all the work for the steps even if the step
	 * has empty states
	 * 
	 * if there is a nodeTypesList and getAllWork is true, we will get all the work
	 * (including work with empty states) only for the node types in the nodeTypesList
	 * 
	 * @return node visits json object containing node visits for student
	 * @throws JSONException
	 */
	private JSONObject getNodeVisitsForStudent(List<Node> nodeList,
			List<String> nodeTypesList, UserInfo userInfo, Run run, boolean getAllWork, boolean getRevisions) throws JSONException {
		JSONObject nodeVisitsJSON = new JSONObject();
		nodeVisitsJSON.put("userName", userInfo.getWorkgroupId());
		nodeVisitsJSON.put("userId", userInfo.getWorkgroupId());

		//the list to hold the StepWork objects for this workgroup
		List<StepWork> stepWorkList = null;

		//check if a list of nodes were passed in
		if (nodeList != null && nodeList.size() > 0) {
			//get all the work for the user and that are for the nodes in the node list
			stepWorkList = vleService.getStepWorksByUserInfoAndNodeList(userInfo, nodeList);
		} else {
			//get all the work for the user
			stepWorkList = vleService.getStepWorksByUserInfo(userInfo);	
		}

		if (getRevisions) {
			//get all revisions

			//loop through all the rows that were returned, each row is a node_visit
			for (int x = 0; x < stepWorkList.size(); x++) {
				StepWork stepWork = stepWorkList.get(x);

				String data = stepWork.getData();
				String stepWorkId = stepWork.getId().toString();

				//obtain the node type for the step work
				String nodeType = stepWork.getNode().getNodeType();

				/*
				 * check that the node type is one that we want if a list of
				 * desired node types was provided. if there is no list of
				 * node types, we will accept all node types
				 */
				if (nodeTypesList == null || (nodeTypesList != null && nodeTypesList.contains(nodeType))) {
					//the node type is accepted
					try {
						JSONObject nodeVisitJSON = new JSONObject(data);
						JSONArray nodeStates = (JSONArray) nodeVisitJSON.get("nodeStates");

						/*
						 * if there are no states for the visit, we will ignore it or if it
						 * is the last/latest visit we will add it so that the vle can
						 * load the last step the student was on.
						 * 
						 * if the node visit is for HtmlNode or OutsideUrlNode,
						 * we will add the node visit since those step types never have
						 * node states. 
						 */
						if (getAllWork || (nodeStates != null && nodeStates.length() > 0 || x == (stepWorkList.size() - 1)) ||
								("HtmlNode".equals(nodeType) || "OutsideUrlNode".equals(nodeType) || "IdeaBasketNode".equals(nodeType))
								|| "FlashNode".equals(nodeType)) {

							//add stepWorkId and visitPostTime attributes to the json obj
							nodeVisitJSON.put("stepWorkId", stepWorkId);
							nodeVisitJSON.put("id", Long.valueOf(stepWorkId));
							nodeVisitJSON.put("visitPostTime", stepWork.getPostTime().getTime());
							
	                        String nodeVisitKeyName = "visitedNodes";  // used in WISE4
	                        if (run != null) {
	                            org.wise.portal.domain.project.Project project = run.getProject();
	                            if (project != null) {
	                                Integer wiseVersion = project.getWiseVersion();
	                                if (wiseVersion != null && wiseVersion == 5) {
	                                    nodeVisitKeyName = "nodeVisits";  // used in WISE5
	                                }
	                            }
	                        }
	                        nodeVisitsJSON.append(nodeVisitKeyName, nodeVisitJSON);
						}
					} catch (JSONException e) {
						e.printStackTrace();
					}								
				}
			}
		} else {
			//only get the latest revision

			Vector<String> stepsRetrieved = new Vector<String>(); 

			/*
			 * loop through the step work objects from latest to earliest
			 * because we are only looking for the latest revision for each
			 * step
			 */
			for (int x = stepWorkList.size() - 1; x >= 0; x--) {
				StepWork stepWork = stepWorkList.get(x);

				String data = stepWork.getData();
				if (data == null || "".equals(data)) {
					// if for some reason data is empty (e.g. bug post), ignore this stepwork
					continue;
				}
				String stepWorkId = stepWork.getId().toString();

				//obtain the node type for the step work
				String nodeType = stepWork.getNode().getNodeType();

				//the id of the node
				String nodeId = stepWork.getNode().getNodeId();

				//check if we have retrieved work for this step already
				if (!stepsRetrieved.contains(nodeId)) {
					//we have not retrieved work for this step yet

					/*
					 * check that the node type is one that we want if a list of
					 * desired node types was provided. if there is no list of
					 * node types, we will accept all node types
					 */
					if (nodeTypesList == null || (nodeTypesList != null && nodeTypesList.contains(nodeType))) {
						//the node type is accepted

						JSONObject nodeVisitJSON = new JSONObject(data);
						JSONArray nodeStates = (JSONArray) nodeVisitJSON.get("nodeStates");

						/*
						 * check if there were any node states and only add the nodevisit if
						 * there were node states. if the node visit is for HtmlNode or OutsideUrlNode,
						 * we will add the node visit since those step types never have
						 * node states. 
						 */
						if (nodeStates != null && nodeStates.length() > 0 ||
								("HtmlNode".equals(nodeType) || "OutsideUrlNode".equals(nodeType) || "IdeaBasketNode".equals(nodeType))) {

							//add stepWorkId and visitPostTime attributes to the json obj
							nodeVisitJSON.put("stepWorkId", stepWorkId);
							nodeVisitJSON.put("id", Long.valueOf(stepWorkId));
							nodeVisitJSON.put("visitPostTime", stepWork.getPostTime().getTime());

							String nodeVisitKeyName = "visitedNodes";  // used in WISE4
							if (run != null) {
							    org.wise.portal.domain.project.Project project = run.getProject();
							    if (project != null) {
							        Integer wiseVersion = project.getWiseVersion();
							        if (wiseVersion != null && wiseVersion == 5) {
							            nodeVisitKeyName = "nodeVisits";  // used in WISE5
							        }
							    }
							}
							nodeVisitsJSON.append(nodeVisitKeyName, nodeVisitJSON);

							stepsRetrieved.add(nodeId);
						}
					}					
				}
			}
		}

		return nodeVisitsJSON;
	}

	@RequestMapping(method=RequestMethod.POST)
	public ModelAndView doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		studentMaxWorkSize = Integer.valueOf(wiseProperties.getProperty("student_max_work_size", "512000"));
		
		//get the signed in user
		User signedInUser = ControllerUtil.getSignedInUser();
		
		String runId = request.getParameter("runId");
		String userId = request.getParameter("userId");
		String periodId = request.getParameter("periodId");
		String data = request.getParameter("data");
		String annotationJSONString = request.getParameter("annotation");
		String annotationsJSONString = request.getParameter("annotations");
		
		//obtain the id the represents the id in the step work table
		String stepWorkId = request.getParameter("id");
		
		
		if (runId == null || userId == null || data == null) {
			response.sendError(HttpServletResponse.SC_BAD_REQUEST, "post data: parameter(s) missing.");
			return null;
		}
		
		Long runIdLong = null;
		if (runId != null) {
			runIdLong = new Long(runId);
		}
		
		Long periodIdLong = null;
		if (periodId != null) {
			periodIdLong = new Long(periodId);
		}
		
		Long workgroupId = null;
		if (userId != null) {
			try {
				workgroupId = new Long(userId);
			} catch (NumberFormatException e) {
				
			}
		}

		// test if user is allowed to make this request.
		boolean allowedAccess = false;
		
		/*
		 * teachers can not make a request
		 * students can make a request if they are in the run and in the workgroup
		 */
		if (SecurityUtils.isStudent(signedInUser) && SecurityUtils.isUserInRun(signedInUser, runIdLong) &&
				SecurityUtils.isUserInWorkgroup(signedInUser, workgroupId)) {
			//the student is in the run and the workgroup so we will allow the request
			allowedAccess = true;
		}
		
		if (!allowedAccess) {
			//the user is not allowed to make this request
			response.sendError(HttpServletResponse.SC_FORBIDDEN);
			return null;
		}
		
		UserInfo userInfo = (UserInfo) vleService.getUserInfoOrCreateByWorkgroupId(workgroupId);

		JSONObject nodeVisitJSON = null;
		
		response.setContentType("application/json");
		
		try {
			nodeVisitJSON = new JSONObject(data);

			Calendar now = Calendar.getInstance();
			Timestamp postTime = new Timestamp(now.getTimeInMillis());

			String nodeId = VLEDataUtils.getNodeId(nodeVisitJSON);
			Timestamp startTime = new Timestamp(new Long(VLEDataUtils.getVisitStartTime(nodeVisitJSON)));
			
			//get the end time
			String visitEndTime = VLEDataUtils.getVisitEndTime(nodeVisitJSON);
			Timestamp endTime = null;
			
			//check that a non null end time was given to us
			if (visitEndTime != null && !visitEndTime.equals("null") && !visitEndTime.equals("")) {
				//create the timestamp
				endTime = new Timestamp(new Long(visitEndTime));
			}

			//obtain the node type from the json node visit
			String nodeType = VLEDataUtils.getNodeType(nodeVisitJSON);
			
			//get the node states array
			JSONArray nodeStates = VLEDataUtils.getNodeStates(nodeVisitJSON);
			
			//loop through all the node states
			for (int x = 0; x < nodeStates.length(); x++) {
				//get an element in the node states array
				Object nodeStateObject = nodeStates.get(x);
				
				//check that the element in the array is a JSONObject
				if (!(nodeStateObject instanceof JSONObject)) {
					//the element in the array is not a JSONObject so we will respond with an error
					response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Element in nodeStates array is not an object");
					return null;
				}
			}
			
			// check if student's posted data size is under the limit
            if (request.getContentLength() > studentMaxWorkSize) {  // posted data must not exceed STUDENT_MAX_WORK_SIZE
                System.err.println("Post data too large (>"+studentMaxWorkSize+" bytes). NodeType: "+nodeType+" RunId: "+ runId+ " userId:"+ userId + " nodeId: "+nodeId + " contentLength: "+request.getContentLength());
                response.sendError(HttpServletResponse.SC_BAD_REQUEST, "post data: too large (>"+studentMaxWorkSize+" bytes)");
                return null;
            }

			StepWork stepWork = null;
			
			// check to see if student has already saved this nodevisit.
			stepWork = vleService.getStepWorkByUserIdAndData(userInfo,nodeVisitJSON.toString());
			if (stepWork != null) {
				// this node visit has already been saved. return id and postTime and exit.
				//create a JSONObject to contain the step work id and post time
				JSONObject jsonResponse = new JSONObject();
				jsonResponse.put("id", stepWork.getId());
				if (endTime != null) {
					//end time is set so we can send back a post time
					if (stepWork.getPostTime() != null) {
						jsonResponse.put("visitPostTime", stepWork.getPostTime().getTime());
					}
				}
				//send back the json string with step work id and post time
				response.getWriter().print(jsonResponse.toString());
				return null;
			}
				
			//check if the step work id was passed in. if it was, then it's an update to a nodevisit.
			if (stepWorkId != null && !stepWorkId.equals("") && !stepWorkId.equals("undefined")) {
				//step work id was passed in so we will obtain the id in long format
				long stepWorkIdLong = Long.parseLong(stepWorkId);
				
				//obtain the StepWork with the given id
				stepWork = (StepWork) vleService.getStepWorkById(stepWorkIdLong);
			} else if (nodeType != null && nodeType != "") {
				//step work id was not passed in so we will create a new StepWork object
				stepWork = new StepWork();
			}

			Node node = getOrCreateNode(runId, nodeId, nodeType);
			
			if (stepWork != null && userInfo != null && node != null) {
				// set the fields of StepWork
				stepWork.setUserInfo(userInfo);
				stepWork.populateData(nodeVisitJSON);
				stepWork.setNode(node);
				stepWork.setPostTime(postTime);
				stepWork.setStartTime(startTime);
				stepWork.setEndTime(endTime);
				vleService.saveStepWork(stepWork);
				
				//get the step work id so we can send it back to the client
				long newStepWorkId = stepWork.getId();
				
				//get the post time so we can send it back to the client
				long newPostTime = postTime.getTime();
				
				//create a JSONObject to contain the step work id and post time
				JSONObject jsonResponse = new JSONObject();
				jsonResponse.put("id", newStepWorkId);
				
				/*
				 * if the endtime is null it means this post was an intermediate
				 * post such as the ones brainstorm performs so we do not want
				 * to send back a post time in that case. when we send back a
				 * post time, it means the node visit is completed but if this
				 * is just an intermediate post we do not want to complete
				 * the visit because the user has not exited the step.
				 */
				if (endTime != null) {
					//end time is set so we can send back a post time
					jsonResponse.put("visitPostTime", newPostTime);
				}
				
				//get the first cRaterItemId if it exists in the POSTed NodeState
				// also check if isSubmit is true
				String cRaterItemId = null;
				String cRaterItemType = "CRATER";
				boolean isCRaterSubmit = false;
				try {
					if (nodeVisitJSON != null) {
						JSONArray nodeStateArray = nodeVisitJSON.getJSONArray("nodeStates");
						if (nodeStateArray != null) {
							if (nodeStateArray.length() > 0) {
								JSONObject nodeStateObj = nodeStateArray.getJSONObject(nodeStateArray.length()-1);
								
								if (nodeStateObj.has("cRaterItemId")) {
									cRaterItemId = nodeStateObj.getString("cRaterItemId");
									if (nodeStateObj.has("isCRaterSubmit")) {
										isCRaterSubmit = nodeStateObj.getBoolean("isCRaterSubmit");
									}
									if (nodeStateObj.has("cRaterItemType")) {
										cRaterItemType = nodeStateObj.getString("cRaterItemType");
									}																	
								}
							}
						}
					}
				} catch (JSONException e) {
					e.printStackTrace();
				}
				/*
				if (cRaterItemId != null) {
					// Send back the cRater item id to the student in the response
					// student VLE would get this cRaterItemId and make a GET to
					// VLEAnnotationController to get the CRater Annotation
					// Only send back cRaterItemId and isCRaterSubmit back if we haven't invoked CRater before for this nodeState
					long lastNodeStateTimestamp = stepWork.getLastNodeStateTimestamp();

					CRaterRequest cRaterRequestForLastNodeState = vleService.getCRaterRequestByStepWorkIdNodeStateId(stepWork, lastNodeStateTimestamp);
					if (cRaterRequestForLastNodeState == null) {
						jsonResponse.put("cRaterItemId", cRaterItemId);
						jsonResponse.put("cRaterItemType", cRaterItemType);
						jsonResponse.put("isCRaterSubmit", isCRaterSubmit);
						// also save a CRaterRequest in db for tracking if isCRaterSubmit is true
						if (isCRaterSubmit) {
							try {
								CRaterRequest cRR = new CRaterRequest(cRaterItemId, cRaterItemType, stepWork, new Long(lastNodeStateTimestamp), runIdLong);
								vleService.saveCRaterRequest(cRR);
							} catch (Exception cre) {
								// do nothing if there was an error, let continue
								cre.printStackTrace();
							}
						}
					}
				}
				*/
				try {
					//if this post is a peerReviewSubmit, add an entry into the peerreviewwork table
					if (VLEDataUtils.isSubmitForPeerReview(nodeVisitJSON)) {
						PeerReviewWork peerReviewWork = null;

						//see if the user has already submitted peer review work for this step
						peerReviewWork = vleService.getPeerReviewWorkByRunPeriodNodeWorkerUserInfo(runIdLong, periodIdLong, node, userInfo);
						
						if (peerReviewWork == null) {
							/*
							 * the user has not submitted peer review work for this step yet
							 * so we will create it
							 */
							peerReviewWork = new PeerReviewWork();
							peerReviewWork.setNode(node);
							peerReviewWork.setRunId(new Long(runId));
							peerReviewWork.setUserInfo(userInfo);
							peerReviewWork.setStepWork(stepWork);
							peerReviewWork.setPeriodId(periodIdLong);
							vleService.savePeerReviewWork(peerReviewWork);
						}
						
						//create an entry for the peerreviewgate table if one does not exist already
						vleService.getOrCreatePeerReviewGateByRunIdPeriodIdNodeId(runIdLong, periodIdLong, node);
					}
				} catch (JSONException e) {
					e.printStackTrace();
				}
				
				//check if there is an annotation that we need to save
				if (annotationJSONString != null && !annotationJSONString.equals("null")) {
					try {
						//get the annotation JSON object
						JSONObject annotationJSONObject = new JSONObject(annotationJSONString);
						
						//get the annotation parameters
						Long annotationRunId = annotationJSONObject.optLong("runId");
						Long toWorkgroup = annotationJSONObject.optLong("toWorkgroup");
						Long fromWorkgroup = annotationJSONObject.optLong("fromWorkgroup");
						String type = annotationJSONObject.optString("type");
						
						//add the step work id and post time to the JSON object
						annotationJSONObject.put("stepWorkId", stepWork.getId());
						annotationJSONObject.put("postTime", postTime.getTime());
						
						//save the annotation JSON object
						saveAnnotationObject(annotationRunId, toWorkgroup, fromWorkgroup, type, annotationJSONObject, stepWork, postTime);
						
						//set the annotation post time into the response
						jsonResponse.put("annotationPostTime", postTime.getTime());
					} catch (JSONException e) {
						e.printStackTrace();
					}
				}
				
                //check if there are annotations that we need to save
                if (annotationsJSONString != null && !annotationsJSONString.equals("null")) {
                    try {
                        //get the annotations JSON array
                        JSONArray annotationsJSONArray = new JSONArray(annotationsJSONString);
                        
                        // loop through all the annotations
                        for (int a = 0; a < annotationsJSONArray.length(); a++) {
                            // get an annotation JSON object
                            JSONObject annotationJSONObject = annotationsJSONArray.optJSONObject(a);
                            
                            //get the annotation parameters
                            Long annotationRunId = annotationJSONObject.optLong("runId");
                            Long toWorkgroup = annotationJSONObject.optLong("toWorkgroup");
                            Long fromWorkgroup = annotationJSONObject.optLong("fromWorkgroup");
                            String type = annotationJSONObject.optString("type");
                            
                            //add the step work id and post time to the JSON object
                            annotationJSONObject.put("stepWorkId", stepWork.getId());
                            annotationJSONObject.put("postTime", postTime.getTime());
                            
                            //save the annotation JSON object
                            saveAnnotationObject(annotationRunId, toWorkgroup, fromWorkgroup, type, annotationJSONObject, stepWork, postTime);
                            
                            //set the annotation post time into the response
                            jsonResponse.put("annotationPostTime", postTime.getTime());
                        }
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                }
				
				//send back the json string with step work id and post time
				response.getWriter().print(jsonResponse.toString());
				
				//check if this node visit should be sent to other users using websockets
				if (isSendToWebSockets(nodeVisitJSON)) {
					//inject the step work id into the node visit JSON
					nodeVisitJSON.put("id", newStepWorkId);
					
					if (webSocketHandler != null) {
						WISEWebSocketHandler wiseWebSocketHandler = (WISEWebSocketHandler) webSocketHandler;
						
						if (wiseWebSocketHandler != null) {
							//send this message to websockets
							wiseWebSocketHandler.handleMessage(signedInUser, nodeVisitJSON.toString());							
						}
					}
				}
			} else {
				response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Error saving: " + nodeVisitJSON.toString());
			}
		} catch (JSONException e) {
			response.sendError(HttpServletResponse.SC_BAD_REQUEST, "malformed data");
			e.printStackTrace();
			return null;
		}
		return null;
	}

	/**
	 * Check if the node visit should be sent to websockets
	 * @param nodeVisit the node visit JSON object
	 * @return whether we should send the node visit to websockets
	 */
	private boolean isSendToWebSockets(JSONObject nodeVisit) {
		boolean result = false;
		
		if (nodeVisit != null) {
			//check if there is a messageType field
			String messageType = nodeVisit.optString("messageType");
			
			//check if there is a messageParticipants field
			String messageParticipants = nodeVisit.optString("messageParticipants");
			
			if (messageType != null && !messageType.equals("") && messageParticipants != null && !messageParticipants.equals("")) {
				/*
				 * the node visit has a messageType and messageParticipants so we will
				 * send it to websockets
				 */
				result = true;
			}
		}
		
		return result;
	}
	
	/**
	 * Synchronized node creation/retrieval
	 * @param runId
	 * @param nodeId
	 * @param nodeType
	 * @return created/retrieved Node, or null
	 */
	private synchronized Node getOrCreateNode(String runId, String nodeId, String nodeType) {
		Node node = vleService.getNodeByNodeIdAndRunId(nodeId, runId);
		if (node == null && nodeId != null && runId != null && nodeType != null) {
			node = new Node();
			node.setNodeId(nodeId);
			node.setRunId(runId);
			node.setNodeType(nodeType);
			vleService.saveNode(node);
		}
		return node;
	}
	
	/**
	 * Save the annotation. If the annotation does not exist we will create a new annotation.
	 * If the annotation already exists we will overwrite the data field in the existing
	 * annotation.
	 * @param runId the run id
	 * @param toWorkgroup the to workgroup id
	 * @param fromWorkgroup the from workgroup id
	 * @param type the annotation type
	 * @param annotationValue the JSONObject we will save into the data field
	 * @param stepWork the step work object this annotation is related to
	 * @param postTime the time this annotation was posted
	 * @return the annotation
	 */
	private Annotation saveAnnotationObject(Long runId, Long toWorkgroup, Long fromWorkgroup, String type, JSONObject annotationValue, StepWork stepWork, Timestamp postTime) {
		Annotation annotation = null;
		
		//get the to user
		UserInfo toUserInfo = vleService.getUserInfoOrCreateByWorkgroupId(toWorkgroup);
		
		//get the from user
		UserInfo fromUserInfo = null;
		if (fromWorkgroup != null && fromWorkgroup != -1) {
			fromUserInfo = vleService.getUserInfoOrCreateByWorkgroupId(toWorkgroup);
		}
		
		//check if there is an existing annotation
		annotation = vleService.getAnnotationByFromUserInfoToUserInfoStepWorkType(fromUserInfo, toUserInfo, stepWork, type);
		
		if (annotation == null) {
			//the annotation for the fromUser, toUser, StepWork, and type does not exist so we will create one
			
			//create the new annotation
			annotation = new Annotation(type);
			
			//set the fields in the annotation object
			annotation.setRunId(runId);
			annotation.setToUser(toUserInfo);
			annotation.setFromUser(fromUserInfo);
			annotation.setStepWork(stepWork);
			annotation.setData(annotationValue.toString());
			annotation.setPostTime(postTime);
			
			//save the annotation object to the database
			vleService.saveAnnotation(annotation);
		} else {
			//the annotation for the fromUser, toUser, StepWork, and type already exists so we will overwrite the data

			//update the data
			annotation.setData(annotationValue.toString());
			
			//update the post time
			annotation.setPostTime(postTime);
			
			//save the annotation
			vleService.saveAnnotation(annotation);
		}
		
		return annotation;
	}
	
    /*
     * Get all the StepWorks for the workgroup ids
     * @param userIdArray a list of workgroup ids
     * @return a list of StepWork objects
     */
    private List<StepWork> getAllStepWorks(String[] userIdArray) {
        
        ArrayList<Long> workgroupIds = new ArrayList<Long>(userIdArray.length);

        // loop through all the workgroup ids
        for (int x = 0; x < userIdArray.length; x++) {
            String userId = userIdArray[x];
            
            // convert the string to a Long
            Long workgroupId = new Long(userId);
            workgroupIds.add(workgroupId);
        }

        // get all the UserInfos for the workgroup ids
        List<UserInfo> userInfos = vleService.getUserInfosByWorkgroupIds(workgroupIds);
        
        // get and return all the StepWorks for the UserInfos

        return vleService.getStepWorksByUserInfos(userInfos);
    }
}