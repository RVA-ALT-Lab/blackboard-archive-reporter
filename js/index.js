
const app = new Vue({
  el: '#app',
  data () {
    return {
      manifest: null,
      users: null,
      gradebookEntries: null,
      courseSettings: null,
      currentView: 'studentList',
      selectedStudent: null
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
  }
})