
const app = new Vue({
  el: '#app',
  data () {
    return {
      manifest: null,
      users: null,
      gradebookEntries: null,
      courseSettings: null,
      currentView: 'studentList',
      selectedStudent: null,
      attemptFiles: null
    }
  },
  computed: {
    individualGradebook () {
      if (!this.selectedStudent) return []
      const individualGradebookEntries = this.gradebookEntries.map(entry => {
        const individualOutcomes =  entry.outcomes && entry.outcomes.length > 0 ? entry.outcomes.filter(outcome => outcome.courseMembershipId === this.selectedStudent.membershipId) : []
        entry.outcomes = individualOutcomes

        const individualHistoryEntries =  entry.gradebookHistoryEntries && entry.gradebookHistoryEntries.length > 0 ? entry.gradebookHistoryEntries.filter(historyEntry => historyEntry.userId === this.selectedStudent.id) : []
        entry.gradebookHistoryEntries = individualHistoryEntries.map(historyEntry => {
          let associatedAttemptFile = this.attemptFiles.filter(attemptFile => attemptFile.attemptId === historyEntry.attemptId)
          if (associatedAttemptFile && associatedAttemptFile.length > 0) {
            historyEntry.attemptFile = associatedAttemptFile[0]
          }
          return historyEntry
        })
        
        
        return entry
      })
      return individualGradebookEntries
    }
  },
  methods: {
    viewGradeReport (student){
      this.selectedStudent = student;
      this.currentView = 'gradeReport'
    },
    viewStudentList (){
      this.selectedStudent = null;
      this.currentView = 'studentList'
    }
  },
  async created () {
    const report = await ReportService.generateReport()
    console.log(report)
    this.gradebookEntries = report.gradebookEntries
    this.users = report.users
    this.courseSettings = report.courseSettings
    this.attemptFiles = report.attemptFiles
  }
})