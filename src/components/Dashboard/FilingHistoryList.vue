<template>
  <div id="filing-history-list">
    <add-comment-dialog
      :dialog="addCommentDialog"
      :filingId="currentFilingId"
      @close="hideCommentDialog($event)"
      attach="#filing-history-list"
    />

    <download-error-dialog
      :dialog="downloadErrorDialog"
      @close="downloadErrorDialog=false"
      attach="#filing-history-list"
    />

    <v-expansion-panels v-if="filedItems.length > 0" v-model="panel">
      <v-expansion-panel
        class="align-items-top filing-history-item"
        v-for="(item, index) in filedItems"
        :key="index"
      >
        <v-expansion-panel-header class="filing-item-toggle">
          <div class="list-item">
            <div class="filing-label">
              <h3>{{item.title}}</h3>
              <div class="list-item__subtitle">
                <v-scale-transition v-if="isCoaFutureEffective(item.type, item.status)">
                  <v-tooltip top content-class="pending-tooltip">
                    <template v-slot:activator="{ on }">
                      <div id="pending-alert" class="list-item__subtitle" v-on="on">
                        <span>FILED AND PENDING (filed by {{item.filingAuthor}} on {{item.filingDate}})</span>
                        <v-icon color="yellow" small>mdi-alert</v-icon>
                      </div>
                    </template>
                    <span>The updated office addresses will be legally effective on {{item.filingEffectiveDate}},
                      12:01 AM (Pacific Time). No other filings are allowed until then.</span>
                  </v-tooltip>
                </v-scale-transition>
                <span v-else>FILED AND PAID (filed by {{item.filingAuthor}} on {{item.filingDate}})</span>
                <template v-if="item.comments.length > 0">
                  <span>{{item.comments.length}} Detail{{item.comments.length > 1 ? "s" : ""}}</span>
                </template>
              </div>
            </div>

            <div class="filing-item__actions">
              <div class="toggle-info">
                <template v-if="panel === index">
                  <span v-if="item.paperOnly">Close</span>
                  <span v-else>Hide Documents</span>
                </template>
                <template v-else>
                  <span v-if="item.paperOnly">Request a Copy</span>
                  <span v-else>View Documents</span>
                </template>
              </div>

              <!-- the drop-down menu -->
              <v-menu bottom left transition="slide-y-transition" v-if="isRoleStaff">
                <template v-slot:activator="{ on }">
                  <v-btn icon v-on="on">
                    <v-icon>mdi-menu-down</v-icon>
                  </v-btn>
                </template>
                <v-list dense>
                  <v-list-item-group color="primary">
                    <!-- NB: this menu item is disabled in current release -->
                    <v-list-item disabled>
                      <v-list-item-icon>
                        <v-icon>mdi-file-document-edit-outline</v-icon>
                      </v-list-item-icon>
                      <v-list-item-title
                        class="file-correction-item"
                        @click="correctThisItem(item)"
                        :disabled="hasBlockerFiling || item.isCorrected"
                      >
                        File a Correction
                      </v-list-item-title>
                    </v-list-item>

                    <v-list-item>
                      <v-list-item-icon>
                        <v-icon>mdi-comment-plus</v-icon>
                      </v-list-item-icon>
                      <v-list-item-title
                        class="add-detail-comment-item"
                        @click="showCommentDialog(item.filingId)"
                      >
                        Add Detail
                      </v-list-item-title>
                    </v-list-item>
                  </v-list-item-group>
                </v-list>
              </v-menu>
            </div>
          </div>
        </v-expansion-panel-header>

        <v-expansion-panel-content>
          <v-list dense class="mt-n1 mb-n3 pt-0 pb-0" v-if="!item.paperOnly">
            <v-list-item class="pl-0 pr-0" v-for="(document, index) in item.filingDocuments" :key="index">
              <v-btn text color="primary"
                class="download-document-btn pl-1 pr-2"
                @click="downloadDocument(document)"
                :disabled="loadingDocument"
                :loading="loadingDocument"
              >
                <v-icon>mdi-file-pdf-outline</v-icon>
                <span>{{document.name}}</span>
              </v-btn>
            </v-list-item>

            <v-list-item class="pl-0 pr-0" v-if="item.paymentToken">
              <v-btn text color="primary"
                class="download-receipt-btn pl-1 pr-2"
                @click="downloadReceipt(item)"
                :disabled="loadingReceipt"
                :loading="loadingReceipt"
              >
                <v-icon>mdi-file-pdf-outline</v-icon>
                <span>Receipt</span>
              </v-btn>
            </v-list-item>

            <v-list-item class="pl-0 pr-0" v-if="!item.paperOnly">
              <v-btn text color="primary"
                class="download-all-btn pl-1 pr-2"
                @click="downloadAll(item)"
                :disabled="loadingAll"
                :loading="loadingAll"
              >
                <v-icon>mdi-download</v-icon>
                <span>Download All</span>
              </v-btn>
            </v-list-item>
          </v-list>

          <div class="paper-filings body-2" v-if="item.paperOnly">
            <p>Filings completed <b>before March 10, 2019</b> are only available from the BC Registry as paper
              documents.</p>
            <p>To request copies of paper documents, contact BC Registry Staff with the document you require and
              the name and incorporation number of your association:</p>
            <ul class="contact-info__list mt-5">
              <li>
                <span>Toll Free:</span> <a href="tel:+1-877-526-1526">1 877 526-1526</a>
              </li>
              <li>
                <span>Phone:</span> <a href="tel:+1-250-387-7848">250 387-7848</a>
              </li>
              <li>
                <span>Email:</span> <a href="mailto:bcregistries@gov.bc.ca">bcregistries@gov.bc.ca</a>
              </li>
            </ul>
          </div>

          <!-- the details section -->
          <div class="comments-section mt-8" v-if="item.comments.length > 0">
            <v-divider></v-divider>
            <div class="title-bar mt-5">
              <h4>Detail{{item.comments.length > 1 ? "s" : ""}} ({{item.comments.length}})</h4>
              <v-btn
                color="primary"
                v-if="isRoleStaff"
                @click.stop="showCommentDialog(item.filingId)"
              >
                <span>Add Detail</span>
              </v-btn>
            </div>
            <div>
              <!-- the details list-->
              <v-list>
                <v-list-item class="pl-0 pr-0" v-for="(comment, index) in item.comments" :key="index">
                  <v-list-item-content>
                    <v-list-item-title class="body-2">
                      <strong v-if="!isRoleStaff">Registry Staff</strong>
                      <strong v-else>{{comment.submitterDisplayName || 'N/A'}}</strong>
                      ({{convertUTCTimeToLocalTime(comment.timestamp)}})
                    </v-list-item-title>
                    <v-list-item-subtitle class="body-2">
                      <div class="pre-line">{{comment.comment}}</div>
                    </v-list-item-subtitle>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </div>
          </div>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- No Results Message -->
    <v-card class="no-results" flat v-if="filedItems.length === 0">
      <v-card-text>
        <div class="no-results__title">You have no filing history</div>
        <div class="no-results__subtitle">Your completed filings and transactions will appear here</div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script lang="ts">
// Libraries
import axios from '@/axios-auth'
import { mapGetters, mapState } from 'vuex'

// Dialogs
import { AddCommentDialog, DownloadErrorDialog } from '@/components/dialogs'

// Enums
import { EntityTypes, FilingNames, FilingStatus, FilingTypes } from '@/enums'

// Mixins
import { DateMixin, EntityFilterMixin } from '@/mixins'

export default {
  name: 'FilingHistoryList',

  mixins: [DateMixin, EntityFilterMixin],

  components: {
    AddCommentDialog,
    DownloadErrorDialog
  },

  data () {
    return {
      addCommentDialog: false,
      downloadErrorDialog: false,
      panel: null, // currently expanded panel
      filedItems: [],
      loadingDocument: false,
      loadingReceipt: false,
      loadingAll: false,
      currentFilingId: null,

      // enums
      EntityTypes
    }
  },

  props: {
    hasBlockerFiling: null
  },

  computed: {
    ...mapGetters(['isRoleStaff']),

    ...mapState(['entityIncNo', 'filings', 'entityName'])
  },

  created (): void {
    // load data into this page
    this.loadData()
  },

  methods: {
    loadData () {
      this.filedItems = []

      // create filed items
      for (let i = 0; i < this.filings.length; i++) {
        const filing = this.filings[i].filing
        if (filing && filing.header) {
          let filingDate = filing.header.date.slice(0, 10)
          if (filingDate < '2019-03-08' || filing.header.availableOnPaperOnly) {
            // filings before Bob Date
            this.loadPaperFiling(filing)
          } else {
            // filings on or after Bob Date
            switch (filing.header.name) {
              case FilingTypes.ANNUAL_REPORT:
                this.loadAnnualReport(filing, filing.annualReport)
                break
              case FilingTypes.CHANGE_OF_DIRECTORS:
                this.loadOtherReport(filing, filing.changeOfDirectors)
                break
              case FilingTypes.CHANGE_OF_ADDRESS:
                this.loadOtherReport(filing, filing.changeOfAddress)
                break
              case FilingTypes.CHANGE_OF_NAME:
                this.loadOtherReport(filing, filing.changeOfName)
                break
              case FilingTypes.SPECIAL_RESOLUTION:
                this.loadOtherReport(filing, filing.specialResolution)
                break
              case FilingTypes.VOLUNTARY_DISSOLUTION:
                this.loadOtherReport(FilingTypes.VOLUNTARY_DISSOLUTION, filing, filing.voluntaryDissolution)
                break
              case FilingTypes.CORRECTION:
                this.loadOtherReport(FilingTypes.CORRECTION, filing.correction)
                break
              default:
                // fallback for unknown filings
                this.loadPaperFiling(filing)
                break
            }
          }
        } else {
          // eslint-disable-next-line no-console
          console.log('ERROR - invalid filing or filing header =', filing)
        }
      }

      this.$emit('filed-count', this.filedItems.length)
      this.$emit('filings-list', this.filedItems)

      // if needed, highlight a specific filing
      // NB: use unary plus operator to cast string to number
      const highlightId = +this.$route.query.filing_id // may be NaN (which is false)
      if (highlightId) { this.highlightFiling(highlightId) }
    },

    // Method to extract date from a local datetime string
    // Returns "yyyy-mm-dd"
    formatDate (dateString: string): string {
      if (!dateString) return null // safety check
      return dateString.split(' ')[0]
    },

    loadAnnualReport (filing, section) {
      if (section) {
        const date = section.annualReportDate
        if (date) {
          const localDateTime = this.convertUTCTimeToLocalTime(filing.header.date)
          const filingDate = this.formatDate(localDateTime)

          const type = filing.header.name
          const agmYear = +date.slice(0, 4)
          const title = this.typeToTitle(type, agmYear)

          const item = {
            type: type,
            title: title,
            filingId: filing.header.filingId,
            filingAuthor: filing.header.certifiedBy,
            filingDateTime: localDateTime,
            filingDate: filingDate,
            paymentToken: filing.header.paymentToken,
            filingDocuments: [{
              filingId: filing.header.filingId,
              name: 'Annual Report',
              documentName: `${this.entityIncNo} - ${title} - ${filingDate}.pdf`
            }],
            paperOnly: false,
            isCorrected: filing.header.isCorrected || false,
            comments: this.flattenAndSortComments(filing.header.comments)
          }
          this.filedItems.push(item)
        } else {
          // eslint-disable-next-line no-console
          console.log('ERROR - invalid Annual Report Date in filing =', filing)
        }
      } else {
        // eslint-disable-next-line no-console
        console.log('ERROR - missing section in filing =', filing)
      }
    },

    loadOtherReport (filing, section) {
      if (section) {
        const localDateTime = this.convertUTCTimeToLocalTime(filing.header.date)
        const filingDate = this.formatDate(localDateTime)

        // Effective date is when the filing is applied to the backend, assigned by the backend when the filing is made.
        // Currently, all filings will be applied immediately except a change of address for a Benefit Company
        // The latter is always effective the following day at 12:01 AM Pacific Time
        let effectiveDate = filing.header.date.slice(0, 10)
        if (filing.header.effectiveDate) effectiveDate = filing.header.effectiveDate.slice(0, 10)

        const type = filing.header.name
        const title = this.typeToTitle(type)

        const item = {
          type: type,
          title: title,
          filingId: filing.header.filingId,
          filingAuthor: filing.header.certifiedBy,
          filingDateTime: localDateTime,
          filingDate: filingDate,
          filingEffectiveDate: effectiveDate,
          paymentToken: filing.header.paymentToken,
          filingDocuments: [{
            filingId: filing.header.filingId,
            name: title,
            documentName: `${this.entityIncNo} - ${title} - ${filingDate}.pdf`
          }],
          status: filing.header.status,
          paperOnly: false,
          isCorrected: filing.header.isCorrected || false,
          comments: this.flattenAndSortComments(filing.header.comments)
        }
        this.filedItems.push(item)
      } else {
        // eslint-disable-next-line no-console
        console.log(`ERROR - missing section in filing =`, filing)
      }
    },

    loadPaperFiling (filing) {
      // split name on camelcase and capitalize first letters
      if (!filing || !filing.header || !filing.header.name) return // safety check

      const localDateTime = this.convertUTCTimeToLocalTime(filing.header.date)
      const filingDate = this.formatDate(localDateTime)

      const type = filing.header.name

      let title: string
      if (filing.annualReport && filing.annualReport.annualReportDate) {
        const agmYear = +filing.annualReport.annualReportDate.slice(0, 4)
        title = this.typeToTitle(type, agmYear)
      } else {
        title = this.typeToTitle(type)
      }

      const item = {
        type: type,
        title: title,
        filingId: filing.header.filingId,
        filingAuthor: 'Registry Staff',
        filingDate: filingDate,
        filingYear: filing.header.date.slice(0, 4),
        paymentToken: null,
        filingDocuments: [{
          filingId: filing.header.filingId,
          name: title,
          documentName: null
        }],
        paperOnly: true,
        isCorrected: filing.header.isCorrected || false,
        comments: this.flattenAndSortComments(filing.header.comments)
      }
      this.filedItems.push(item)
    },

    flattenAndSortComments (comments: any): Array<any> {
      if (comments && comments.length > 0) {
        // first use map to change comment.comment to comment
        const flattened: Array<any> = comments.map(c => c.comment)
        // then sort newest to oldest
        const sorted = flattened.sort((a, b) => new Date(a.timestamp) < new Date(b.timestamp) ? 1 : -1)
        return sorted
      }
      return []
    },

    typeToTitle (type: string, agmYear: string = null): string {
      if (!type) return '' // safety check
      switch (type) {
        case FilingTypes.ANNUAL_REPORT: return FilingNames.ANNUAL_REPORT + (agmYear ? ` (${agmYear})` : '')
        case FilingTypes.CHANGE_OF_DIRECTORS: return FilingNames.DIRECTOR_CHANGE
        case FilingTypes.CHANGE_OF_ADDRESS: return FilingNames.ADDRESS_CHANGE
        case FilingTypes.CHANGE_OF_NAME: return FilingNames.LEGAL_NAME_CHANGE
        case FilingTypes.SPECIAL_RESOLUTION: return FilingNames.SPECIAL_RESOLUTION
        case FilingTypes.VOLUNTARY_DISSOLUTION: return FilingNames.VOLUNTARY_DISSOLUTION
        case FilingTypes.CORRECTION: return FilingNames.CORRECTION
      }
      // fallback for unknown filings
      return type.split(/(?=[A-Z])/).join(' ').replace(/^\w/, c => c.toUpperCase())
    },

    highlightFiling (highlightId: number) {
      // expand the panel of the matching filing
      for (let i = 0; i < this.filedItems.length; i++) {
        // assume there is always a filing document
        if (this.filedItems[i].filingDocuments[0].filingId === highlightId) {
          this.panel = i
          break
        }
      }
    },

    correctThisItem (item) {
      if (!item || !item.type) return // safety check
      switch (item.type) {
        case FilingTypes.ANNUAL_REPORT:
          // FUTURE:
          // this.$router.push({ name: 'annual-report', params: { id: item.filingId, isCorrection: true } })
          // FOR NOW:
          this.$router.push({ name: 'correction', params: { id: item.filingId } })
          break
        case FilingTypes.CHANGE_OF_DIRECTORS:
          // FUTURE:
          // this.$router.push({ name: 'standalone-directors', params: { id: item.filingId, isCorrection: true } })
          // FOR NOW:
          this.$router.push({ name: 'correction', params: { id: item.filingId } })
          break
        case FilingTypes.CHANGE_OF_ADDRESS:
          // FUTURE:
          // this.$router.push({ name: 'standalone-addresses', params: { id: item.filingId, isCorrection: true } })
          // FOR NOW:
          this.$router.push({ name: 'correction', params: { id: item.filingId } })
          break
        case FilingTypes.CORRECTION:
          // FUTURE:
          // this.$router.push({ name: 'correction', params: { id: item.filingId, isCorrection: true } })
          // FOR NOW:
          this.$router.push({ name: 'correction', params: { id: item.filingId } })
          break
        default:
          // fallback for all other filings
          this.$router.push({ name: 'correction', params: { id: item.filingId } })
          break
      }
    },

    async downloadDocument (filingDocument) {
      this.loadingDocument = true
      await this.downloadOneDocument(filingDocument)
      this.loadingDocument = false
    },

    async downloadOneDocument (filingDocument) {
      const url = this.entityIncNo + '/filings/' + filingDocument.filingId
      const headers = { 'Accept': 'application/pdf' }

      await axios.get(url, { headers: headers, responseType: 'blob' as 'json' }).then(response => {
        if (response) {
          /* solution from https://github.com/axios/axios/issues/1392 */

          // it is necessary to create a new blob object with mime-type explicitly set
          // otherwise only Chrome works like it should
          const blob = new Blob([response.data], { type: 'application/pdf' })

          // IE doesn't allow using a blob object directly as link href
          // instead it is necessary to use msSaveOrOpenBlob
          if (window.navigator && window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(blob, filingDocument.documentName)
          } else {
            // for other browsers, create a link pointing to the ObjectURL containing the blob
            const url = window.URL.createObjectURL(blob)
            const a = window.document.createElement('a')
            window.document.body.appendChild(a)
            a.setAttribute('style', 'display: none')
            a.href = url
            a.download = filingDocument.documentName
            a.click()
            window.URL.revokeObjectURL(url)
            a.remove()
          }
        } else {
          // eslint-disable-next-line no-console
          console.log('downloadOneDocument() error - null response')
          this.downloadErrorDialog = true
        }
      }).catch(error => {
        // eslint-disable-next-line no-console
        console.error('loadOneDocument() error =', error)
        this.downloadErrorDialog = true
      })
    },

    async downloadReceipt (filing) {
      this.loadingReceipt = true
      await this.downloadOneReceipt(filing)
      this.loadingReceipt = false
    },

    async downloadOneReceipt (filing) {
      const url = filing.paymentToken + '/receipts'
      const data = {
        corpName: this.entityName,
        filingDateTime: filing.filingDateTime,
        fileName: 'receipt' // not used
      }
      const config = {
        headers: { 'Accept': 'application/pdf' },
        responseType: 'blob' as 'json',
        baseURL: sessionStorage.getItem('PAY_API_URL') + 'payment-requests/'
      }

      await axios.post(url, data, config).then(response => {
        if (response) {
          const fileName = `${this.entityIncNo} - Receipt - ${filing.filingDate}.pdf`

          /* solution from https://github.com/axios/axios/issues/1392 */

          // it is necessary to create a new blob object with mime-type explicitly set
          // otherwise only Chrome works like it should
          const blob = new Blob([response.data], { type: 'application/pdf' })

          // IE doesn't allow using a blob object directly as link href
          // instead it is necessary to use msSaveOrOpenBlob
          if (window.navigator && window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(blob, fileName)
          } else {
            // for other browsers, create a link pointing to the ObjectURL containing the blob
            const url = window.URL.createObjectURL(blob)
            const a = window.document.createElement('a')
            window.document.body.appendChild(a)
            a.setAttribute('style', 'display: none')
            a.href = url
            a.download = fileName
            a.click()
            window.URL.revokeObjectURL(url)
            a.remove()
          }
        } else {
          // eslint-disable-next-line no-console
          console.log('downloadOneReceipt() error - null response')
          this.downloadErrorDialog = true
        }
      }).catch(error => {
        // eslint-disable-next-line no-console
        console.error('downloadOneReceipt() error =', error)
        this.downloadErrorDialog = true
      })
    },

    async downloadAll (filing) {
      this.loadingAll = true
      // first download document(s)
      for (let i = 0; i < filing.filingDocuments.length; i++) {
        await this.downloadOneDocument(filing.filingDocuments[i])
      }
      // finally download receipt
      if (filing.paymentToken) {
        await this.downloadOneReceipt(filing)
      }
      this.loadingAll = false
    },

    /**
     * Function to return a boolean if this specific filing is future affective.
     *
     * @param filingType The type of the filing in the history list.
     * @param status The status of the filing in the history list.
     * @return A boolean indicating if the filing is future effective.
     */
    isCoaFutureEffective (filingType: string, status: string): boolean {
      return this.entityFilter(EntityTypes.BCOMP) &&
        filingType === FilingTypes.CHANGE_OF_ADDRESS &&
        status === FilingStatus.PAID
    },

    showCommentDialog (filingId: number): void {
      this.currentFilingId = filingId
      this.addCommentDialog = true
    },

    async hideCommentDialog (needReload: boolean): Promise<void> {
      this.addCommentDialog = false
      // if needed, reload comments for this filing
      // NB: no spinner or state change, just do it quietly
      if (needReload) await this.reloadComments(this.currentFilingId)
    },

    async reloadComments (filingId: number): Promise<void> {
      // find the filing in the list
      const filing = this.filedItems.find(item => (item.filingId === filingId))

      if (filing) {
        // fetch latest comments for this filing
        const url = this.entityIncNo + '/filings/' + filingId
        await axios.get(url).then(res => {
          if (res && res.data && res.data.filing && res.data.filing.header) {
            // reassign just the comments
            filing.comments = this.flattenAndSortComments(res.data.filing.header.comments)
          } else {
            // eslint-disable-next-line no-console
            console.log('reloadComments() error - invalid response =', res)
          }
        }).catch(error => {
          // eslint-disable-next-line no-console
          console.error('reloadComments() error =', error)
        })
      } else {
        // eslint-disable-next-line no-console
        console.error('reloadComments() error - could not find filing id =', filingId)
      }
    }
  },

  watch: {
    filings () {
      // if filings changes, reload them
      // (does not fire on initial page load)
      this.loadData()
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@/assets/styles/theme.scss";

.list-item {
  align-items: flex-start;
  justify-content: space-between;
  padding: 0;
}

.v-col-padding {
  padding: 0 12px 0 12px;
}

.filing-label {
  flex-basis: 33.3333%;
  flex: 1 1 auto;
}

.pending-tooltip {
  max-width: 16rem;
}

.pending-icon {
  background-color: black;
}

.list-item__subtitle {
  span + span {
    &:before {
      display: inline-block;
      margin-left: 0.5rem;
      margin-right: 0.5rem;
      content: "•";
    }
  }
}

.form__btns {
  justify-content: flex-end;
}

.v-expansion-panel-header {
  padding-top: 1.25rem !important;
  padding-bottom: 1.25rem !important;
}

.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

::v-deep {
  .v-expansion-panel-header__icon {
    display: none !important;
  }
}

.filing-history-item h3 {
  margin-bottom: 0.25rem;
}

.filing-item__actions {
  margin-top: -0.5rem;
  white-space: nowrap;

  .toggle-info {
    display: inline-block;
    letter-spacing: -0.01rem;
    font-size: 0.875rem;
    font-weight: 700;
    margin-right: 0.5rem;
  }
}

.comments-section h4 {
  letter-spacing: 0;
  font-size: 0.9375rem;
  font-weight: 700;
}
</style>
