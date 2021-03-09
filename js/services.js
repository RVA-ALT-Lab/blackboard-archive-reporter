const DataService = {
  async getCourseSettings(manifest) {
    const settingsFile = manifest.resources.resource.filter(resource => resource['@attributes']['type'] === BBTerms.COURSESETTINGS)
    const url = `./export/archive/${settingsFile[0]['@attributes']['bb:file']}`
    const result = await this.getDataAsJSON(url)
    return {
      courseId: result['COURSE']['COURSEID']['@attributes']['value'],
      courseTitle: result['COURSE']['TITLE']['@attributes']['value']
    }
  },
  async getUsers(manifest) {
    const usersFile = manifest.resources.resource.filter(resource => resource['@attributes']['type'] === BBTerms.USERS)
    const result = await this.getDataAsJSON(`./export/archive/${usersFile[0]['@attributes']['bb:file']}`)
    const courseMemberships = await this.getCourseMemberships(manifest)
    const users = result['USERS']['USER'].map(user => {
      const membership = courseMemberships.filter(membership => membership['USERID']['@attributes']['value'] === user['@attributes']['id'])[0]
      return {
        id: user['@attributes']['id'],
        emailAddress: user['EMAILADDRESS']['@attributes']['value'],
        fullName: `${user['NAMES']['GIVEN']['@attributes']['value']} ${user['NAMES']['FAMILY']['@attributes']['value']}`,
        studentId: user['STUDENTID']['@attributes']['value'],
        userName: user['USERNAME']['@attributes']['value'],
        membershipId: membership['@attributes']['id']
      }
    })
    return users
  },
  async getCourseMemberships(manifest) {
    const courseMembershipsFile = manifest.resources.resource.filter(resource => resource['@attributes']['type'] === BBTerms.COURSEMEMBERSHIPS)
    const result = await this.getDataAsJSON(`./export/archive/${courseMembershipsFile[0]['@attributes']['bb:file']}`)
    return result['COURSEMEMBERSHIPS']['COURSEMEMBERSHIP']
  },
  async getAttemptFiles(manifest) {
    const attemptFilesDataReferences = manifest.resources.resource.filter(resource => resource['@attributes']['type'] === BBTerms.ATTEMPTFILES)
    
    return await GradebookService.getAttemptFiles(attemptFilesDataReferences)
  },
  async getGradebook(manifest) {
    const gradebookFile = manifest.resources.resource.filter(resource => resource['@attributes']['type'] === BBTerms.GRADEBOOK)
    const result = await this.getDataAsJSON(`./export/archive/${gradebookFile[0]['@attributes']['bb:file']}`)
    const gradebook = result["GRADEBOOK"]
    console.log(gradebook)
    const assignments = GradebookService.getOutcomeDefinitions(gradebook)
    return assignments
  },
  async getDataAsJSON(url = './export/archive/imsmanifest.xml') {
    const xml = await fetch(url)
    .then(response => response.text())
    .then(text => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'application/xml')
      return xml
    })
    const json = xmlToJson(xml)
    return json
  }
}

const ReportService = {
  async generateReport() {
    const { manifest } = await DataService.getDataAsJSON('./export/archive/imsmanifest.xml')
    const courseSettings = await DataService.getCourseSettings(manifest)
    const users = await DataService.getUsers(manifest)
    const gradebookEntries = await DataService.getGradebook(manifest)
    const attemptFiles = await DataService.getAttemptFiles(manifest)
    return {
      courseSettings,
      users,
      gradebookEntries,
      attemptFiles
    }
  }
}


const GradebookService = {
  getOutcomeDefinitions(gradebook) {
    const assignments = gradebook['OUTCOMEDEFINITIONS']['OUTCOMEDEFINITION']
      // .filter(outcomeDefinition => outcomeDefinition['OUTCOMES']['OUTCOME'] && outcomeDefinition['OUTCOMES']['OUTCOME'].length > 0)
      .map(outcomeDefinition => {
        return {
          id: outcomeDefinition['@attributes']['id'],
          displayTitle: outcomeDefinition['DISPLAY_TITLE']['@attributes']['value'],
          title: outcomeDefinition['TITLE']['@attributes']['value'],
          categoryId: outcomeDefinition['CATEGORYID']['@attributes']['value'],
          isScorable: outcomeDefinition['ISSCORABLE']['@attributes']['value'],
          multipleAttempts: outcomeDefinition['MULTIPLEATTEMPTS']['@attributes']['value'],
          singleAttempt: outcomeDefinition['SINGLE_ATTEMPT']['@attributes']['value'],
          pointsPossible: parseInt(outcomeDefinition['POINTSPOSSIBLE']['@attributes']['value']),
          dates: {
            created: outcomeDefinition['DATES']['CREATED']['@attributes']['value'],
            due: outcomeDefinition['DATES']['DUE']['@attributes']['value'],
            updated: outcomeDefinition['DATES']['UPDATED']['@attributes']['value'],
          },
          outcomes: outcomeDefinition['OUTCOMES']['OUTCOME'] && outcomeDefinition['OUTCOMES']['OUTCOME'].length > 0 ?
          this.getIndividualOutcomes(outcomeDefinition['OUTCOMES']['OUTCOME']) :
          null,
          gradebookHistoryEntries: this.getGradebookHistoryEntries(outcomeDefinition['@attributes']['id'], gradebook['GRADE_HISTORY_ENTRIES']['GRADE_HISTORY_ENTRY'])
        }
      })
    
    return assignments

  },
  getIndividualOutcomes(outcomes) {
    const individualOutcomes = outcomes.map(outcome => {
      const attempt = outcome['ATTEMPTS']['ATTEMPT']
      return {
        outcomeId: outcome['@attributes']['id'],
        courseMembershipId: outcome['COURSEMEMBERSHIPID']['@attributes']['value'],
        //attempt: outcome['ATTEMPTS']['ATTEMPT'],
        attempt: {
          attemptId: attempt && attempt.hasOwnProperty('@attributes') ? attempt['@attributes']['id'] : null,
          score: attempt && attempt.hasOwnProperty('@attributes') ? attempt['SCORE']['@attributes']['value'] : null,
          grade: attempt && attempt.hasOwnProperty('@attributes') ? attempt['GRADE']['@attributes']['value'] : null,
          status: attempt && attempt.hasOwnProperty('@attributes') ? attempt['STATUS']['@attributes']['value'] : null,
          latest: attempt && attempt.hasOwnProperty('@attributes') ? attempt['LATEST']['@attributes']['value'] : null,
          dateAttempted: attempt && attempt.hasOwnProperty('@attributes') ? attempt['DATEATTEMPTED']['@attributes']['value'] : null,
          dateAdded: attempt && attempt.hasOwnProperty('@attributes') ? attempt['DATEADDED']['@attributes']['value'] : null,
          dateFirstGraded: attempt && attempt.hasOwnProperty('@attributes') ? attempt['DATEFIRSTGRADEDED']['@attributes']['value'] : null,
          dateLastGraded: attempt && attempt.hasOwnProperty('@attributes') ? attempt['DATELASTGRADED']['@attributes']['value'] : null,
        }
      }
    })
    return individualOutcomes
  },
  getGradebookHistoryEntries(gradeableItemId, gradebookHistoryEntries) {

    return gradebookHistoryEntries.filter(entry => {
      if (!entry['GRADABLE_ITEM_ID']) return false 
      if (gradeableItemId === entry['GRADABLE_ITEM_ID']['@attributes']['value']) return true
    }).map(entry => {
      return {
        dateAttempted: entry['DATEATTEMPTED']['@attributes']['value'],
        dateLogged: entry['DATELOGGED'] ? entry['DATELOGGED']['@attributes']['value'] : null,
        grade: entry['GRADE']['@attributes']['value'],
        userId: entry['USERID']['@attributes']['value'],
        attemptId: entry['ATTEMPT_ID'] ? entry['ATTEMPT_ID']['@attributes']['value'] : null,
      }
    })
    .filter(entry => entry.grade !== '')
  },
  async getAttemptFiles(attemptFilesDataReferences) {
    const calls = attemptFilesDataReferences.map(reference => {
      return DataService.getDataAsJSON(`./export/archive/${reference['@attributes']['bb:file']}`)
    })
    const fileData = await Promise.all(calls)
    const formattedFiles = attemptFilesDataReferences.map((reference, index) => {
      const folderIdentifier = reference['@attributes']['identifier']
      const files = fileData[index]['ATTEMPTFILES']['ATTEMPTFILE'].map(file => {
        const currentFileAttemptId = file['@attributes']['id']
        const fileLink = reference.file.filter(link => {
          const href = link['@attributes']['href']
          if (href.includes(currentFileAttemptId)) return true
        })
        return {
          attemptFileId: currentFileAttemptId,
          attemptId: file['ATTEMPTID']['@attributes']['value'],
          filePath: `/export/archive/${folderIdentifier}/${fileLink[0]['@attributes']['href']}`
        }
      })
      return files
    })
    const combinedFiles = [].concat(...formattedFiles)
    return combinedFiles
  }
}
const BBTerms = {
  GRADEBOOK: 'course/x-bb-gradebook',
  COURSEMEMBERSHIPS: 'membership/x-bb-coursemembership',
  USERS: 'course/x-bb-user',
  COURSESETTINGS: 'course/x-bb-coursesetting',
  ATTEMPTFILES: 'course/x-bb-attemptfiles'
}

// Changes XML to JSON
function xmlToJson(xml) {

	// Create the return object
	var obj = {};

	if (xml.nodeType == 1) { // element
		// do attributes
		if (xml.attributes.length > 0) {
		obj["@attributes"] = {};
			for (var j = 0; j < xml.attributes.length; j++) {
				var attribute = xml.attributes.item(j);
				obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
			}
		}
	} else if (xml.nodeType == 3) { // text
		obj = xml.nodeValue;
	}

	// do children
	if (xml.hasChildNodes()) {
		for(var i = 0; i < xml.childNodes.length; i++) {
			var item = xml.childNodes.item(i);
			var nodeName = item.nodeName;
			if (typeof(obj[nodeName]) == "undefined") {
				obj[nodeName] = xmlToJson(item);
			} else {
				if (typeof(obj[nodeName].push) == "undefined") {
					var old = obj[nodeName];
					obj[nodeName] = [];
					obj[nodeName].push(old);
				}
				obj[nodeName].push(xmlToJson(item));
			}
		}
	}
	return obj;
};



    // .filter(outcome => outcome['OUTCOMES']['OUTCOME'] && outcome['OUTCOMES']['OUTCOME'].length > 0)
    // .map(outcome => {
    //   const studentOutcomes = outcome['OUTCOMES']['OUTCOME']
        // .map(studentOutcome => {
        //   const attempts =
        //   studentOutcome['ATTEMPTS']['ATTEMPT'] &&
        //   studentOutcome['ATTEMPTS']['ATTEMPT'].length > 0 ?
        //   studentOutcome['ATTEMPTS']['ATTEMPT'].map(attempt => {
        //     return {
        //       status: attempt['STATUS']['@attributes']['value'],
        //       latest: attempt['LATEST']['@attributes']['value'],
        //       dateAttempted: attempt['DATEATTEMPTED']['@attributes']['value'],
        //       grade: attempt['GRADE']['@attributes']['value']
        //     }
        //   }) : []

        // })
      // return studentOutcomes
      // return {
      //   outcomeId: outcome['@attributes']['id'],
      //   title: outcome['TITLE']['@attributes']['value'],
      //   categoryId: outcome['CATEGORYID']['@attributes']['value'],
      //   weight: outcome['WEIGHT']['@attributes']['value'],
      //   isCalculated: outcome['ISCALCULATED']['@attributes']['value'],
      //   studentOutcomes: outcome['OUTCOMES']['OUTCOME']
      // }
    // })
    // const categories = gradebook['CATEGORIES']['CATEGORY'].map(category => {
    //   return {
    //     categoryId: category['@attributes']['id'],
    //     title: category['TITLE']['@attributes']['value'],
    //     isScorable: category['ISSCORABLE']['@attributes']['value'],
    //     isCalculated: category['ISCALCULATED']['@attributes']['value']

    //   }
    // })
    // let categoriesHash = {}
    // categories.forEach(category => {
    //   categoriesHash[category.categoryId] = category
    // })
    // console.log(categoriesHash)

    // const gradebookEntries =
    //   gradebook['GRADE_HISTORY_ENTRIES']['GRADE_HISTORY_ENTRY']
    //   .map(entry => {
    //     return {
    //       gradeEntryId: entry['@attributes']['id'],
    //       gradeableItemId: entry['GRADABLE_ITEM_ID']['@attributes']['value'],
    //       assignment: categoriesHash[entry['GRADABLE_ITEM_ID']['@attributes']['value']] || null,
    //       grade: entry['GRADE']['@attributes']['value'],
    //       numericGrade: entry['NUMERIC_GRADE']['#text'],
    //       courseMembershipId: entry['USERID']['@attributes']['value'],
    //       dateAttempted: entry['DATEATTEMPTED']['@attributes']['value'],
    //       dateLogged: entry['DATE_LOGGED']['@attributes']['value']
    //     }
    //   })