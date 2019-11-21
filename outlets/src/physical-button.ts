import { Gpio } from 'onoff'
import { Outlets } from './Outlets'
const LED = new Gpio(6, 'out')
const pushButton = new Gpio(19, 'in', 'rising', { debounceTimeout: 10 })

export const initPhysicalButton = (outlets: Outlets, group: string) => {
  outlets.watch(group, () => {
    LED.writeSync(outlets.groupOn(group) ? 1 : 0)
  })

  pushButton.watch((err, buttonValue) => {
    if (err) {
      console.log(`Error in pushbutton.watch: ${Error}`)
      return
    }
    if (buttonValue === 1) {
      outlets.toggleRequest(group)
    } else {
      console.log(`WARNING: Pushbutton not rising... Should not be processed.`)
    }
  })
}
