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
package org.wise.portal.dao.status.impl;

import java.util.List;

import org.hibernate.NonUniqueResultException;
import org.hibernate.Session;
import org.hibernate.criterion.Restrictions;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.wise.portal.dao.ObjectNotFoundException;
import org.wise.portal.dao.impl.AbstractHibernateDao;
import org.wise.portal.dao.status.StudentStatusDao;
import org.wise.vle.domain.status.StudentStatus;

@Repository
public class HibernateStudentStatusDao extends AbstractHibernateDao<StudentStatus> implements StudentStatusDao<StudentStatus> {

	@Override
	protected String getFindAllQuery() {
		return null;
	}

	@Override
	protected Class<? extends StudentStatus> getDataObjectClass() {
		return null;
	}

	public StudentStatus getStudentStatusById(Long id) {
		StudentStatus studentStatus = null;
		
		try {
			studentStatus = getById(id);
		} catch (ObjectNotFoundException e) {
			e.printStackTrace();
		}
		
		return studentStatus;
	}
	
	@Transactional
	public void saveStudentStatus(StudentStatus studentStatus) {
		save(studentStatus);
	}
	
	/**
	 * Get a StudentStatus object given the workgroup id
	 * @param workgroupId the workgroup id
	 * @return the StudentStatus with the given workgroup id or null if none is found
	 */
	@Transactional
	public StudentStatus getStudentStatusByWorkgroupId(Long workgroupId) {
		StudentStatus result = null;
		
		try {
			Session session = this.getHibernateTemplate().getSessionFactory().getCurrentSession();
			
			/*
			 * get all the student status rows with the given workgroup id.
			 * there should only be one but somehow there are a couple of
			 * workgroups that have multiple rows, perhaps because the 
			 * transactions were not synchronized.
			 */
			List<StudentStatus> list = session.createCriteria(StudentStatus.class).add(Restrictions.eq("workgroupId", workgroupId)).list();
			
			if(list != null && list.size() > 0) {
				//get the first element in the list if the list contains more than one element
				result = list.get(0);
			}
		} catch (NonUniqueResultException e) {
			throw e;
		}
		
		return result;
	}
	
	/**
	 * Get all the StudentStatus objects for a given period id
	 * @param periodId the period id
	 * @return a list of StudentStatus objects
	 */
	@Transactional
	public List<StudentStatus> getStudentStatusesByPeriodId(Long periodId) {
		Session session = this.getHibernateTemplate().getSessionFactory().getCurrentSession();
        
        List<StudentStatus> studentStatuses = session.createCriteria(StudentStatus.class).add(Restrictions.eq("periodId", periodId)).list();
        
        return studentStatuses;
	}
	
	/**
	 * Get all the StudentStatus objects for a given run id
	 * @param runId the run id
	 * @return a list of StudentStatus objects
	 */
	@Transactional
	public List<StudentStatus> getStudentStatusesByRunId(Long runId) {
		Session session = this.getHibernateTemplate().getSessionFactory().getCurrentSession();
        
        List<StudentStatus> studentStatuses = session.createCriteria(StudentStatus.class).add(Restrictions.eq("runId", runId)).list();
        
        return studentStatuses;
	}
}
