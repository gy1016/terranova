package main

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/png"
	"math"
	"runtime"
	"strings"
	"syscall/js"
)

// 用于接收js中传入半径值
var memoRadius = make(map[string]int)

// 用于设置所有点位中的最大热力值
var memoHeater = make(map[string]float64)

// 用于接收js中传入的最大密度
var memoMaxIntensity = make(map[string]float64)

// 用于接收js中传入的层级
var memoZoom = make(map[string]float64)

// 用于接收js中传入的热力点位
var memoPoints = make(map[string][][3]float64)

// 用于接收js中传入的热力梯度值
var memoGradients = make(map[string][][3]uint8)

// 防止程序宕机，必须运行在defer下
func panicNotifyer() {
	// recover只能用于defer函数下，用于接收panic传入的值，恢复程序的运行
	if err := recover(); err != nil {
		var pc [16]uintptr
		var stack = make([]string, 0)
		var stackFunc, stackFile string
		var stackLine int
		// 调用者用调用 goroutine 堆栈上函数调用的返回程序计数器填充片 PC。
		n := runtime.Callers(2, pc[:])
		for _, pc := range pc[:n] {
			fn := runtime.FuncForPC(pc)
			if fn == nil {
				continue
			}
			stackFile, stackLine = fn.FileLine(pc)
			stackFunc = fn.Name()
			if strings.HasPrefix(stackFunc, "runtime.") {
				continue
			}
			stack = append(stack, fmt.Sprintf("%s\t%s:%d", stackFunc, stackFile, stackLine))
		}
		js.Global().Call(
			"panicNotification",
			fmt.Sprintf("%v", err),
			strings.Join(stack, "\n"))
	}
}

// 向内存中填充点位数组
func addPoints(_ js.Value, args []js.Value) interface{} {
	defer panicNotifyer()
	// n行3列的数组
	var myPoints [][3]float64
	// 传入id
	id := args[0].String()
	// js传入点数组
	newPoints := args[1]
	heater := float64(0)
	// 内存中是否已经存在
	myPoints, present := memoPoints[id]
	if !present {
		myPoints := make([][3]float64, 0)
		memoPoints[id] = myPoints
	}
	for i := 0; i < newPoints.Length(); i++ {
		p := newPoints.Index(i)
		lat := p.Index(0).Float()
		lng := p.Index(1).Float()
		weight := p.Index(2).Float()
		// heater是点数组中的weight最大值
		heater = math.Max(heater, weight)
		myPoints = append(myPoints, [3]float64{lat, lng, weight})
	}
	memoPoints[id] = myPoints
	memoHeater[id] = heater
	return heater
}

// 设置点位影响半径
func setRadius(_ js.Value, args []js.Value) interface{} {
	defer panicNotifyer()
	id := args[0].String()
	memoRadius[id] = args[1].Int()
	return memoRadius[id]
}

// 设置当前地图层级
func setZoom(_ js.Value, args []js.Value) interface{} {
	defer panicNotifyer()
	id := args[0].String()
	memoZoom[id] = args[1].Float()
	return memoZoom[id]
}

// 设置最大密度
func setMaxIntensity(_ js.Value, args []js.Value) interface{} {
	defer panicNotifyer()
	id := args[0].String()
	memoMaxIntensity[id] = args[1].Float()
	return memoMaxIntensity[id]
}

// 向内存中填充js传入的梯度数组
func setGradient(_ js.Value, args []js.Value) interface{} {
	defer panicNotifyer()
	id := args[0].String()
	newGradient := args[1]
	myGradient := make([][3]uint8, 0)
	for i := 0; i < newGradient.Length(); i++ {
		color := newGradient.Index(i)
		red := uint8(color.Index(0).Int())
		green := uint8(color.Index(1).Int())
		blue := uint8(color.Index(2).Int())
		myGradient = append(myGradient, [3]uint8{red, green, blue})
	}
	memoGradients[id] = myGradient
	return newGradient.Length()
}

// 将点位根据瓦片行列号、瓦片大小得到点位相对于单张瓦片的相对坐标
func pointToPix(point [3]float64, tileX, tileY, size int, zoom float64) (int, int, float64) {
	defer panicNotifyer()
	lat := point[0]
	lng := point[1]
	weight := point[2]
	// 2^zoom个1 * 点所在的坐标占比
	x := (lng + 180.0) / 360.0 * math.Exp2(zoom)
	y := (1.0 - math.Log(
		math.Tan(lat*math.Pi/180.0)+
			1.0/math.Cos(lat*math.Pi/180.0))/
		math.Pi) /
		2.0 * (math.Exp2(zoom))
	relativeX := int((x - float64(tileX)) * float64(size))
	relativeY := int((y - float64(tileY)) * float64(size))
	return relativeX, relativeY, weight
}

// 热力信息转成颜色值
func heatToColor(heat, maxIntensity float64, gradient [][3]uint8) (uint8, uint8, uint8, uint8) {
	var r, g, b, a uint8
	gradSteps := len(gradient)
	stepLen := maxIntensity / float64(gradSteps)
	// 整数部分，小数部分
	gradStepF, gradPos := math.Modf(heat / stepLen)
	gradStep := int(math.Round(gradStepF))
	// 如果热力值超出最大值，则直接赋予最深的颜色
	if gradStep >= gradSteps {
		r = gradient[gradSteps-1][0]
		g = gradient[gradSteps-1][1]
		b = gradient[gradSteps-1][2]
		a = 255
	} else {
		// 如果当前热力值连第一段都没有超出去，则直接赋予第1段颜色
		if gradStep == 0 {
			r = gradient[0][0]
			g = gradient[0][1]
			b = gradient[0][2]
			a = uint8(math.Round(255 * gradPos))
		} else {
			gradPosInv := 1 - gradPos
			r = uint8(math.Round(float64(gradient[gradStep-1][0])*gradPosInv +
				float64(gradient[gradStep-0][0])*gradPos))
			g = uint8(math.Round(float64(gradient[gradStep-1][1])*gradPosInv +
				float64(gradient[gradStep-0][1])*gradPos))
			b = uint8(math.Round(float64(gradient[gradStep-1][2])*gradPosInv +
				float64(gradient[gradStep-0][2])*gradPos))
			a = 255
		}
	}
	return r, g, b, a
}

// 根据半径填充点周围一圈的热力值
// ! 这种做法貌似有问题，如果连个圆相交貌似只能保存后者的热力值
func plotHeat(heatMatrix [][]float64, size, pointX, pointY, radius int, weight float64) {
	defer panicNotifyer()
	for x := pointX - radius; x < pointX+radius; x++ {
		if x >= 0 && x < size {
			for y := pointY - radius; y < pointY+radius; y++ {
				if y >= 0 && y < size {
					dX := pointX - x
					dY := pointY - y
					dist := math.Sqrt(float64(dX*dX + dY*dY))
					force := 1.0 - (dist / float64(radius))
					if force < 0 {
						force = 0
					}
					heatMatrix[y][x] += weight * force
				}
			}
		}
	}
}

// js: function createTile(id, tileX, tileY, tileSize)
func createTile(_ js.Value, args []js.Value) interface{} {
	defer panicNotifyer()
	id := args[0].String()
	// 瓦片行号
	tileX := args[1].Int()
	// 瓦片列号
	tileY := args[2].Int()
	// 瓦片大小256
	size := args[3].Int()
	radius := memoRadius[id]
	zoom := memoZoom[id]
	gradient := memoGradients[id]
	points := memoPoints[id]
	numPoints := len(points)
	heater := memoHeater[id]
	maxIntensity := memoMaxIntensity[id]
	if maxIntensity == -1 {
		maxIntensity = heater
	}
	// 下面两步用来初始化256*256的二维矩阵
	// Go初始化二维矩阵的方式也好蠢
	heatMatrix := make([][]float64, size) // Sum the weight of each pixel.
	for i := 0; i < size; i++ {
		heatMatrix[i] = make([]float64, size)
	}
	// 根据输入点信息填充数组
	for i := 0; i < numPoints; i++ {
		// 根据行列号和层级转成相对坐标
		x, y, weight := pointToPix(points[i], tileX, tileY, size, zoom)
		plotHeat(heatMatrix, size, x, y, radius, weight)
	}
	tile := image.NewNRGBA(image.Rect(0, 0, size, size))
	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			pos := tile.PixOffset(x, y)
			r, g, b, a := heatToColor(heatMatrix[y][x], maxIntensity, gradient)
			tile.Pix[pos+0] = r
			tile.Pix[pos+1] = g
			tile.Pix[pos+2] = b
			tile.Pix[pos+3] = a
		}
	}
	var pngBuffer bytes.Buffer
	png.Encode(&pngBuffer, tile)
	return base64.StdEncoding.EncodeToString(pngBuffer.Bytes())
}

func main() {
	// golang中的空结构体：省内存，尤其在事件通信的时候；struct零值就是本身，读取close的channel返回零值；
	c := make(chan struct{})

	js.Global().Set("addPoints", js.FuncOf(addPoints))
	js.Global().Set("setGradient", js.FuncOf(setGradient))
	js.Global().Set("setMaxIntensity", js.FuncOf(setMaxIntensity))
	js.Global().Set("createTile", js.FuncOf(createTile))
	js.Global().Set("setRadius", js.FuncOf(setRadius))
	js.Global().Set("setZoom", js.FuncOf(setZoom))

	// <-c用来从channel c中接收数据，这个表达式会一直被block，直到有数据可以接收。
	<-c
}
